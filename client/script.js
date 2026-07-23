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
  catch{return null;}
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
      resumeText=(await file.text()).slice(0,1500);
    }

    /* ✅ STRICT ATS RULE */
    if(resumeUploaded){

      if(resumeText.length < 200){
        atsScore = 2;
        atsSummary = "Resume too short or poorly extracted. Add proper experience and skills sections.";
        roleImprovement = "Include measurable achievements relevant to the selected role.";
      } else {

        const keywords=role.toLowerCase().split(" ");
        let match=0;

        keywords.forEach(k=>{
          if(resumeText.toLowerCase().includes(k)) match++;
        });

        atsScore = Math.max(3, Math.min(10, Math.round((match/keywords.length)*10)));

        atsSummary = "Resume shows moderate alignment with selected role.";
        roleImprovement = "Add more role-specific achievements and quantified impact.";
      }
    }

    const prompt=`
You are a strict senior ${role} interviewer.
Ask 5 realistic interview questions
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

function loadQuestion(){
  document.getElementById("questionBox").innerText=
  `Question ${currentIndex+1}: ${questions[currentIndex]}`;
}

/* ================= STRICT EVALUATION ================= */

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

async function evaluateInterview(){

  const interviewSection=document.getElementById("interview");
  interviewSection.innerHTML=`
    <div class="card glass">
      <h2>Evaluating...</h2>
      <div class="loader"></div>
    </div>
  `;

  let totalTechnical=0;
  let totalCommunication=0;

  for(let i=0;i<answers.length;i++){

    const answer=answers[i].toLowerCase();
    const wordCount=answer.split(/\s+/).length;

    let technical=5;
    let communication=5;

    /* ✅ HARD RULES */

    if(answer==="no" || answer==="yes"){
      technical=1;
      communication=1;
    }
    else if(wordCount < 10){
      technical=1;
      communication=2;
    }
    else if(wordCount < 25){
      technical=3;
      communication=4;
    }
    else{
      technical=7;
      communication=6;
    }

    totalTechnical+=technical;
    totalCommunication+=communication;
  }

  const avgTechnical=Math.round(totalTechnical/answers.length);
  const avgCommunication=Math.round(totalCommunication/answers.length);

  showDashboard({
    technical:avgTechnical,
    communication:avgCommunication
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
    <div style="margin-top:30px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>ATS Analysis</h3>
      <p>${atsSummary}</p>
    </div>

    <div style="margin-top:20px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>Role Improvement Suggestions</h3>
      <p>${roleImprovement}</p>
    </div>
  `;
}