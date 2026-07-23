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

    /* ================= REALISTIC ATS SCORING ================= */

    if(resumeUploaded){

      const resumeLower = resumeText.toLowerCase();

      const roleSkills = {
        "Frontend Developer": ["html","css","javascript","react","ui","frontend"],
        "Backend Developer": ["node","express","api","database","sql","mongodb"],
        "Full Stack Developer": ["react","node","api","database","javascript"],
        "Data Scientist": ["python","machine learning","pandas","data","model"],
        "Machine Learning Engineer": ["python","tensorflow","model","data","ml"],
        "DevOps Engineer": ["docker","kubernetes","aws","ci","cd"],
        "Cloud Engineer": ["aws","cloud","azure","deployment","server"],
        "Software Engineer": ["programming","api","database","algorithm","git"]
      };

      const expectedSkills = roleSkills[role] || [];

      let matchCount = 0;

      expectedSkills.forEach(skill=>{
        if(resumeLower.includes(skill)){
          matchCount++;
        }
      });

      if(matchCount===0){
        atsScore=2;
      }
      else if(matchCount<=2){
        atsScore=4;
      }
      else if(matchCount<=4){
        atsScore=6;
      }
      else{
        atsScore=8 + Math.min(2,Math.floor(matchCount/2));
      }

      atsScore=Math.min(10,atsScore);

      if(atsScore<=3){
        atsSummary="Resume does not align well with the selected technical role.";
        roleImprovement="Add relevant technical skills and real software projects.";
      }
      else if(atsScore<=6){
        atsSummary="Resume shows partial alignment but lacks strong technical depth.";
        roleImprovement="Add measurable achievements and deeper technical contributions.";
      }
      else{
        atsSummary="Resume strongly aligns with the selected technical role.";
        roleImprovement="Improve formatting and quantify impact to strengthen profile.";
      }
    }

    /* ================= HUMAN QUESTIONS ================= */

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

function loadQuestion(){
  document.getElementById("questionBox").innerText=
  `Question ${currentIndex+1}: ${questions[currentIndex]}`;
}

/* ================= STRICT INTERVIEW SCORING ================= */

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

    if(answer==="no"||answer==="yes"){
      technical=1;
      communication=1;
    }
    else if(wordCount<10){
      technical=1;
      communication=2;
    }
    else if(wordCount<25){
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
    <div style="margin-top:25px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>ATS Analysis</h3>
      <p>${atsSummary}</p>
    </div>

    <div style="margin-top:20px;padding:20px;background:#0f172a;border-radius:10px;">
      <h3>Role Improvement Suggestions</h3>
      <p>${roleImprovement}</p>
    </div>
  `;
}