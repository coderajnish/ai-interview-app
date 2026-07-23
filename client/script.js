particlesJS("particles-js", {
  particles:{
    number:{value:60},
    size:{value:3},
    color:{value:"#3b82f6"},
    line_linked:{enable:true,color:"#6366f1"},
    move:{speed:2}
  }
});

let questions=[];
let answers=[];
let currentIndex=0;
let resumeUploaded=false;
let atsScore=null;
let atsSummary="";
let roleImprovement="";

const roles=[
  "Frontend Developer","Backend Developer","Full Stack Developer",
  "Data Scientist","Machine Learning Engineer","DevOps Engineer",
  "Cloud Engineer","Mobile App Developer","Cybersecurity Analyst",
  "UI/UX Designer","Product Manager","AI Engineer","Software Engineer"
];

const roleSelect=document.getElementById("role");
roles.forEach(r=>{
  const option=document.createElement("option");
  option.value=r;
  option.textContent=r;
  roleSelect.appendChild(option);
});

function goToSetup(){switchScreen("setup");}

function switchScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function safeParse(text){
  try{return JSON.parse(text);}
  catch{
    try{
      const cleaned=text.replace(/```json/g,"").replace(/```/g,"").trim();
      return JSON.parse(cleaned);
    }catch{return null;}
  }
}

/* ✅ PDF EXTRACTION */
async function extractPDFText(file){
  const reader=new FileReader();
  return new Promise(resolve=>{
    reader.onload=async function(){
      const typedarray=new Uint8Array(this.result);
      const pdf=await pdfjsLib.getDocument(typedarray).promise;
      let text="";
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);
        const content=await page.getTextContent();
        text+=content.items.map(item=>item.str).join(" ");
      }
      resolve(text.slice(0,2000));
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ================= GENERATE QUESTIONS ================= */

async function generateQuestions(){

  const loader=document.getElementById("loadingSetup");
  loader.classList.remove("hidden");

  try{

    const role=document.getElementById("role").value;
    const level=document.getElementById("level").value;
    const file=document.getElementById("resumeUpload").files[0];

    resumeUploaded=!!file;
    let resumeText="";

    if(file){
      if(file.type==="application/pdf"){
        resumeText=await extractPDFText(file);
      }else{
        resumeText=(await file.text()).slice(0,2000);
      }
    }

    /* ✅ STRICT AI ATS SCORING */
    if(resumeUploaded){

      if(resumeText.length < 150){
        atsScore = 2;
        atsSummary = "Resume content too short or poorly structured.";
        roleImprovement = "Ensure clear sections: Skills, Experience, Projects.";
      }
      else{

        const atsPrompt = `
You are a VERY STRICT Applicant Tracking System.

Analyze this resume for the role: ${role}

Evaluate:
1. Technical skill alignment
2. Project relevance
3. Experience depth
4. Resume clarity
5. Role relevance

Scoring Rules:
1-3 = Poor alignment
4-6 = Moderate alignment
7-8 = Strong alignment
9-10 = Excellent alignment ONLY if clearly role-specific and technically deep

Return STRICT JSON:

{
  "score": number,
  "analysis": "Brief explanation why score was given",
  "improvement": "Specific suggestions for ${role}"
}

Resume:
${resumeText}
`;

        const res=await fetch("https://ai-interview-app-h4yt.onrender.com/api/interview/generate",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({answers:atsPrompt})
        });

        const data=await res.json();
        const parsed=safeParse(data.result);

        if(parsed){
          atsScore = parsed.score;
          atsSummary = parsed.analysis;
          roleImprovement = parsed.improvement;
        }
        else{
          atsScore = 4;
          atsSummary = "Unable to analyze resume properly.";
          roleImprovement = "Improve structure and technical clarity.";
        }
      }
    }

    /* ✅ HUMAN QUESTIONS */

    const prompt=`
You are a strict senior ${role} interviewer.

Ask 5 realistic conversational interview questions
for a ${level} candidate.

Return JSON array only.
`;

    const response=await fetch("https://ai-interview-app-h4yt.onrender.com/api/interview/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({answers:prompt})
    });

    const data=await response.json();
    const parsed=safeParse(data.result);

    if(!parsed||!Array.isArray(parsed)){
      throw new Error("Invalid question format");
    }

    questions=parsed.map(q=>{
      if(typeof q==="string")return q;
      if(typeof q==="object"&&q.question)return q.question;
      return String(q);
    });

    currentIndex=0;
    answers=[];
    loader.classList.add("hidden");
    switchScreen("interview");
    loadQuestion();

  }catch(e){
    loader.classList.add("hidden");
    alert("Error generating questions.");
    console.error(e);
  }
}

/* ================= INTERVIEW FLOW ================= */

function loadQuestion(){
  document.getElementById("questionBox").innerText=
  `Question ${currentIndex+1}: ${questions[currentIndex]}`;
}

async function nextQuestion(){

  const ans=document.getElementById("answerInput").value.trim();
  if(!ans)return alert("Answer required");

  answers.push(ans);
  document.getElementById("answerInput").value="";
  currentIndex++;

  if(currentIndex<questions.length){
    loadQuestion();
  }else{
    evaluateInterview();
  }
}

/* ================= STRICT INTERVIEW EVALUATION ================= */

async function evaluateInterview(){

  const role=document.getElementById("role").value;

  const interviewSection=document.getElementById("interview");
  interviewSection.innerHTML=`
    <div class="card glass">
      <h2>Evaluating...</h2>
      <div class="loader"></div>
    </div>
  `;

  const combined=answers.join("\n");

  const strictPrompt=`
You are a VERY STRICT ${role} interviewer.

Evaluate overall performance.

Scoring Rules:
1-3 = Weak/vague
4-6 = Basic understanding
7-8 = Strong technical depth
9-10 = Expert only if detailed and structured

Return JSON:
{
 "technical": number,
 "communication": number,
 "overall_feedback": "Brief honest summary",
 "role_feedback": "How candidate performed for ${role}"
}

Answers:
${combined}
`;

  const res=await fetch("https://ai-interview-app-h4yt.onrender.com/api/interview/generate",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({answers:strictPrompt})
  });

  const data=await res.json();
  const parsed=safeParse(data.result);

  let technical=parsed?.technical||5;
  let communication=parsed?.communication||5;

  const totalWords=combined.split(/\s+/).length;

  if(totalWords<30){
    technical=Math.max(1,technical-3);
    communication=Math.max(1,communication-2);
  }

  showDashboard({
    technical,
    communication,
    overall_feedback: parsed?.overall_feedback||"",
    role_feedback: parsed?.role_feedback||""
  });
}

/* ================= DASHBOARD ================= */

function showDashboard(result){

  switchScreen("dashboard");

  const cards=document.getElementById("scoreCards");
  const feedbackSection=document.getElementById("feedbackSection");

  cards.innerHTML="";

  if(resumeUploaded){
    cards.innerHTML+=`
      <div class="score-card">
        ATS Score<br>${atsScore}/10
      </div>
    `;
  }

  cards.innerHTML+=`
    <div class="score-card">
      Technical<br>${result.technical}/10
    </div>
    <div class="score-card">
      Communication<br>${result.communication}/10
    </div>
  `;

  feedbackSection.innerHTML=`
    <div style="margin-top:25px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>ATS Analysis</h3>
      <p>${atsSummary}</p>
    </div>

    <div style="margin-top:20px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>Overall Interview Feedback</h3>
      <p>${result.overall_feedback}</p>
    </div>

    <div style="margin-top:20px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>Role-Specific Feedback</h3>
      <p>${roleImprovement || result.role_feedback}</p>
    </div>
  `;
}