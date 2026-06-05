(() => {
  const form = document.getElementById("facwa-inquiry-form");
  const dropzone = document.getElementById("facwa-upload-dropzone");
  const input = document.getElementById("facwa-upload-input");
  const list = document.getElementById("facwa-upload-list");
  const tagInput = document.getElementById("facwa-tag-input");
  const tagList = document.getElementById("facwa-tag-list");
  const status = document.getElementById("facwa-inquiry-status");

  if (!form || !dropzone || !input || !list || !tagInput || !tagList || !status) return;

  const formatSize = (bytes) => {
    if (!bytes) return "0KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / (1024 ** index)).toFixed(index === 0 ? 0 : 1)}${units[index]}`;
  };

  const createFileItem = (file) => {
    const item = document.createElement("article");
    item.className = "facwa-upload-item";
    item.dataset.fileName = file.name;
    item.dataset.fileSize = String(file.size || 0);
    item.innerHTML = `
      <div class="facwa-upload-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6V2Zm7 1.5V7h3.5L13 3.5Z" fill="currentColor"/></svg>
      </div>
      <div>
        <strong></strong>
        <span></span>
      </div>
      <button type="button" aria-label="파일 삭제">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Z" fill="currentColor"/></svg>
      </button>
    `;
    item.querySelector("strong").textContent = file.name;
    item.querySelector("span").textContent = formatSize(file.size);
    return item;
  };

  const addFiles = (files) => {
    Array.from(files).forEach((file) => {
      list.appendChild(createFileItem(file));
    });
  };

  const getTags = () => Array.from(tagList.querySelectorAll("[data-tag]"))
    .map((item) => item.dataset.tag)
    .filter(Boolean);

  const getFiles = () => Array.from(list.querySelectorAll(".facwa-upload-item"))
    .map((item) => ({
      name: item.dataset.fileName || item.querySelector("strong")?.textContent || "",
      size: Number(item.dataset.fileSize || 0),
    }))
    .filter((file) => file.name);

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.dataset.type = type;
  };

  input.addEventListener("change", () => {
    addFiles(input.files);
    input.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    addFiles(event.dataTransfer.files);
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    button.closest(".facwa-upload-item")?.remove();
  });

  const addTag = (value) => {
    const tag = value.replace(/^#/, "").trim();
    if (!tag) return;
    const exists = Array.from(tagList.querySelectorAll("[data-tag]")).some((item) => item.dataset.tag === tag);
    if (exists) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.tag = tag;
    button.innerHTML = "<span></span><i aria-hidden=\"true\">×</i>";
    button.querySelector("span").textContent = tag;
    tagList.appendChild(button);
  };

  tagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    addTag(tagInput.value);
    tagInput.value = "";
  });

  tagList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tag]");
    if (!button) return;
    button.remove();
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      list.innerHTML = "";
      tagList.innerHTML = "";
      setStatus("");
    }, 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector(".facwa-inquiry-submit");
    const formData = new FormData(form);
    const payload = {
      title: formData.get("title"),
      path: formData.get("path"),
      description: formData.get("description"),
      tags: getTags(),
      files: getFiles(),
    };

    submitButton.disabled = true;
    form.classList.add("is-submitted");
    setStatus("신청 내용을 저장하는 중입니다.", "pending");

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "신청 저장에 실패했습니다.");
      }

      setStatus(`Markdown 파일이 생성되었습니다: ${result.path}`, "success");
      form.reset();
      list.innerHTML = "";
      tagList.innerHTML = "";
    } catch (error) {
      setStatus(error.message || "신청 저장에 실패했습니다.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
})();
