import { ACCOUNT_POSITIONS } from "../shared/accountRegistration";

const SHARED_AUTH_STYLES = `
    :root {
      color-scheme: light;
      --bg: #f4f6f8;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --danger: #dc2626;
      --radius-md: 12px;
      --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
      --font: "Noto Sans JP", system-ui, -apple-system, sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--bg);
      font-family: var(--font);
      color: var(--text);
    }

    .auth-card {
      width: min(100%, 420px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      padding: 28px 24px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
    }

    .lead {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .field {
      margin-bottom: 14px;
    }

    input, select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
      background: #fff;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    input.invalid {
      border-color: var(--danger);
    }

    .hint, .field-error {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.5;
    }

    .hint { color: var(--text-muted); }
    .field-error { color: var(--danger); min-height: 1.2em; }

    .radio-group {
      display: grid;
      gap: 8px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text);
      font-weight: 500;
    }

    .radio-option input {
      width: auto;
    }

    button, .auth-link {
      width: 100%;
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-block;
    }

    button[type="submit"] {
      border: none;
      background: var(--primary);
      color: #fff;
    }

    button[type="submit"]:hover:not(:disabled) {
      background: var(--primary-hover);
    }

    button[type="submit"]:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    button[type="submit"].negative {
      background: #94a3b8;
    }

    .auth-link {
      margin-top: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
    }

    .auth-link:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .error, .success {
      margin-top: 12px;
      font-size: 13px;
      min-height: 1.2em;
    }

    .error { color: var(--danger); }
    .success { color: #15803d; }
`;

export const LOGIN_PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>ログイン - POP作成ツール</title>
  <style>${SHARED_AUTH_STYLES}</style>
</head>
<body>
  <div class="auth-card">
    <h1>POP作成ツール</h1>
    <p class="lead">アカウント名とパスワードを入力してください。</p>
    <form id="login-form">
      <div class="field">
        <label for="username">アカウント名</label>
        <input id="username" name="username" type="text" autocomplete="username" required autofocus>
      </div>
      <div class="field">
        <label for="password">パスワード</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
      </div>
      <button type="submit" id="submit">ログイン</button>
      <p class="error" id="error" role="alert" aria-live="polite"></p>
    </form>
    <a class="auth-link" href="/register">アカウント登録申請</a>
  </div>
  <script>
    const form = document.getElementById("login-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("submit");
    const errorEl = document.getElementById("error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      submitButton.disabled = true;
      submitButton.textContent = "確認中...";

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value,
          }),
        });

        if (response.ok) {
          window.location.replace("/");
          return;
        }

        const data = await response.json().catch(() => ({}));
        errorEl.textContent = data.error || "ログインに失敗しました";
      } catch {
        errorEl.textContent = "通信に失敗しました";
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "ログイン";
      }
    });
  </script>
</body>
</html>`;

const positionOptions = ACCOUNT_POSITIONS.map(
  (position) => `<label class="radio-option"><input type="radio" name="position" value="${position}" required> ${position}</label>`,
).join("");

export const REGISTER_PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>アカウント登録申請 - POP作成ツール</title>
  <style>${SHARED_AUTH_STYLES}</style>
</head>
<body>
  <div class="auth-card">
    <h1>POP作成ツールアカウント作成申請</h1>
    <p class="lead">管理者の承認後にログインできるようになります。</p>
    <form id="register-form">
      <div class="field">
        <label for="displayName">名前 <span aria-hidden="true">*</span></label>
        <input id="displayName" name="displayName" type="text" required>
      </div>
      <div class="field">
        <label for="store">所属店舗</label>
        <input id="store" name="store" type="text">
      </div>
      <div class="field">
        <span class="label-text">職位 <span aria-hidden="true">*</span></span>
        <div class="radio-group" role="radiogroup" aria-label="職位">
          ${positionOptions}
        </div>
      </div>
      <div class="field">
        <label for="desiredUsername">希望ID <span aria-hidden="true">*</span></label>
        <input id="desiredUsername" name="desiredUsername" type="text" autocomplete="username" required>
        <p class="field-error" id="username-error" aria-live="polite"></p>
      </div>
      <div class="field">
        <label for="password">パスワード <span aria-hidden="true">*</span></label>
        <input id="password" name="password" type="password" autocomplete="new-password" required>
      </div>
      <div class="field">
        <span class="label-text">管理者(入江)に連絡をしていますか？ <span aria-hidden="true">*</span></span>
        <p class="hint">※管理者に伝達していない場合登録に時間がかかる場合があります。</p>
        <div class="radio-group" role="radiogroup" aria-label="管理者への連絡">
          <label class="radio-option"><input type="radio" name="contactedAdmin" value="yes" required> はい</label>
          <label class="radio-option"><input type="radio" name="contactedAdmin" value="no" required> いいえ</label>
        </div>
      </div>
      <button type="submit" id="submit" disabled>登録申請</button>
      <p class="error" id="error" role="alert" aria-live="polite"></p>
      <p class="success" id="success" role="status" aria-live="polite"></p>
    </form>
    <a class="auth-link" href="/">ログインに戻る</a>
  </div>
  <script>
    const form = document.getElementById("register-form");
    const displayNameInput = document.getElementById("displayName");
    const storeInput = document.getElementById("store");
    const desiredUsernameInput = document.getElementById("desiredUsername");
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("submit");
    const usernameErrorEl = document.getElementById("username-error");
    const errorEl = document.getElementById("error");
    const successEl = document.getElementById("success");

    let usernameTaken = false;
    let usernameCheckTimer = null;

    function getPosition() {
      const selected = form.querySelector('input[name="position"]:checked');
      return selected ? selected.value : "";
    }

    function getContactedAdmin() {
      const selected = form.querySelector('input[name="contactedAdmin"]:checked');
      return selected ? selected.value : "";
    }

    function isFormComplete() {
      return Boolean(
        displayNameInput.value.trim() &&
        getPosition() &&
        desiredUsernameInput.value &&
        passwordInput.value &&
        (getContactedAdmin() === "yes" || getContactedAdmin() === "no")
      );
    }

    function updateSubmitState() {
      const complete = isFormComplete();
      submitButton.disabled = !complete || usernameTaken;
      submitButton.classList.toggle("negative", usernameTaken);
      submitButton.textContent = usernameTaken ? "使用できません" : "登録申請";
    }

    async function checkUsername() {
      const username = desiredUsernameInput.value;
      if (!username) {
        usernameTaken = false;
        usernameErrorEl.textContent = "";
        desiredUsernameInput.classList.remove("invalid");
        updateSubmitState();
        return;
      }

      try {
        const response = await fetch("/api/auth/register/check?username=" + encodeURIComponent(username));
        const data = await response.json();
        usernameTaken = !data.available;
        usernameErrorEl.textContent = usernameTaken ? "使用できません" : "";
        desiredUsernameInput.classList.toggle("invalid", usernameTaken);
      } catch {
        usernameTaken = false;
        usernameErrorEl.textContent = "";
      }
      updateSubmitState();
    }

    function scheduleUsernameCheck() {
      if (usernameCheckTimer) window.clearTimeout(usernameCheckTimer);
      usernameCheckTimer = window.setTimeout(() => { void checkUsername(); }, 250);
    }

    form.addEventListener("input", updateSubmitState);
    form.addEventListener("change", updateSubmitState);
    desiredUsernameInput.addEventListener("input", scheduleUsernameCheck);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      successEl.textContent = "";
      if (usernameTaken) return;

      submitButton.disabled = true;
      submitButton.textContent = "送信中...";

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayNameInput.value.trim(),
            store: storeInput.value.trim() || null,
            position: getPosition(),
            desiredUsername: desiredUsernameInput.value,
            password: passwordInput.value,
            contactedAdmin: getContactedAdmin() === "yes",
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          successEl.textContent = data.message || "申請を受け付けました。";
          form.reset();
          usernameTaken = false;
          usernameErrorEl.textContent = "";
          desiredUsernameInput.classList.remove("invalid");
          updateSubmitState();
          return;
        }

        if (data.code === "USERNAME_TAKEN") {
          usernameTaken = true;
          usernameErrorEl.textContent = "使用できません";
          desiredUsernameInput.classList.add("invalid");
        }

        errorEl.textContent = data.error || "申請の送信に失敗しました";
      } catch {
        errorEl.textContent = "通信に失敗しました";
      } finally {
        updateSubmitState();
      }
    });

    updateSubmitState();
  </script>
</body>
</html>`;
