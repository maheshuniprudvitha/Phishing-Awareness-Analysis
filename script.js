"use strict";

const messageInput = document.querySelector("#message-input");
const analyzeButton = document.querySelector("#analyze-button");
const characterCount = document.querySelector("#character-count");
const inputError = document.querySelector("#input-error");
const results = document.querySelector("#results");

const samples = {
  safe: `From: Maya Chen <maya.chen@northstar.example>
Subject: Friday project notes

Hi team,

I've added the meeting notes to our usual shared folder. Please review them before Monday's planning meeting. Let me know if anything needs correcting.

Thanks,
Maya`,
  phishing: `From: Account Security <urgent-update@secure-account-alert.example>
Subject: URGENT: Your account will be suspended

Your account has been temporarily restricted. Verify your identity immediately to avoid permanent suspension.

Click here to restore access: http://account-verify.example/login

Reply with your password and the one-time verification code sent to your phone. Open the attached security_update.zip to complete the process.`
};

const checks = [
  {
    key: "links",
    title: "Suspicious links",
    pattern: /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi,
    score: 2,
    describe: (matches) => matches.map((match) => match.replace(/[),.;!?]+$/, ""))
  },
  {
    key: "urgency",
    title: "Urgent or threatening language",
    pattern: /\b(?:urgent(?:ly)?|immediately|act now|right away|expires today|final notice|suspend(?:ed|sion)?|locked|terminated|within \d+ hours?|limited time|avoid (?:closure|suspension|termination)|unauthorized)\b/gi,
    score: 2
  },
  {
    key: "credentials",
    title: "Sensitive information request",
    pattern: /\b(?:passwords?|passcodes?|one[- ]time (?:codes?|passwords?)|verification codes?|OTPs?|social security (?:number|#)|credit card (?:number|details)|bank (?:details|account)|personal information|login credentials?)\b/gi,
    score: 3
  },
  {
    key: "sender",
    title: "Potentially suspicious sender address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    score: 1,
    describe: (matches) => matches.filter((address) => /(?:security|support|admin|verify|alert|account|billing|service)[-_]?(?:notice|update|team)?@/i.test(address) || /(?:secure|verify|account|login|support|alert|update)[-_]?(?:center|notice|team)?\./i.test(address.split("@")[1]))
  },
  {
    key: "grammar",
    title: "Possible spelling or writing issues",
    pattern: /\b(?:kindly|dear customer|dear user|congradulations|recieve|kindley|verifiy|informations|your account are|click on below|dear valued customer)\b/gi,
    score: 1
  },
  {
    key: "login",
    title: "Login or verification prompt",
    pattern: /\b(?:verify (?:your )?(?:identity|account|login)|confirm (?:your )?(?:account|identity)|sign[ -]?in|log[ -]?in|restore access|validate your account|reset your password|update your (?:password|account)|authenticate)\b/gi,
    score: 2
  },
  {
    key: "attachments",
    title: "Attachment or download prompt",
    pattern: /\b(?:open|download|install|enable|view|see attached|attachment|attached file|attached document)\b.{0,55}\b(?:attachment|file|document|download|zip|exe|invoice|form|update)?\b|\b(?:attachment|attached (?:file|document)|download|install)\b/gi,
    score: 2
  }
];

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function analyzeMessage(message) {
  let score = 0;
  const findings = checks.map((check) => {
    const matches = unique([...message.matchAll(check.pattern)].map((match) => match[0]));
    const relevantMatches = check.describe ? check.describe(matches) : matches;
    if (relevantMatches.length > 0) score += check.score;
    return { title: check.title, matches: relevantMatches };
  });

  const level = score >= 6 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
  return { level, score, findings, redFlags: findings.filter((finding) => finding.matches.length > 0) };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function recommendationFor(level) {
  if (level === "HIGH") {
    return "Do not click links, open attachments, or reply with information. Verify the request through a trusted, separate channel and report the message.";
  }
  if (level === "MEDIUM") {
    return "Pause before taking action. Check the sender and verify any request using contact details from an official source.";
  }
  return "No common warning signs were detected by these checks. That does not guarantee the message is safe—verify unexpected requests independently.";
}

function showResults(analysis) {
  const levelClass = analysis.level.toLowerCase();
  const intro = analysis.redFlags.length
    ? `We found ${analysis.redFlags.length} type${analysis.redFlags.length === 1 ? "" : "s"} of warning sign. Review the details below.`
    : "No warning signs from this tool's limited checklist were detected. Keep using your usual caution.";

  const findings = analysis.findings.map((finding) => {
    const details = finding.matches.length
      ? `<p>${finding.matches.map(escapeHtml).join(", ")}</p>`
      : '<p class="clear">No obvious signal detected</p>';
    return `<article class="finding"><h4><span>${finding.matches.length ? "!" : "·"}</span>${finding.title}</h4>${details}</article>`;
  }).join("");

  results.innerHTML = `
    <div class="results-header">
      <div class="results-title">
        <span class="risk-icon ${levelClass}" aria-hidden="true">${analysis.level === "LOW" ? "✓" : "!"}</span>
        <div><div class="result-kicker">ESTIMATED MESSAGE RISK</div><div class="risk-label ${levelClass}">${analysis.level} RISK</div></div>
      </div>
      <span class="result-count">${analysis.redFlags.length} warning sign type${analysis.redFlags.length === 1 ? "" : "s"} found</span>
    </div>
    <div class="results-body">
      <p>${intro}</p>
      <div class="findings-grid">${findings}</div>
      <div class="recommendation"><strong>Safer next step:</strong> ${recommendationFor(analysis.level)}</div>
    </div>`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

messageInput.addEventListener("input", () => {
  characterCount.textContent = `${messageInput.value.length.toLocaleString()} / 10,000`;
  inputError.hidden = true;
});

document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value = samples[button.dataset.sample];
    messageInput.dispatchEvent(new Event("input"));
    messageInput.focus();
  });
});

analyzeButton.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (!message) {
    inputError.textContent = "Paste a message or choose a sample before analyzing.";
    inputError.hidden = false;
    messageInput.focus();
    return;
  }
  inputError.hidden = true;
  showResults(analyzeMessage(message));
});
