// Springboards for Community Development - Client Logic
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isExpanded));
      navToggle.classList.toggle("active");
      navMenu.classList.toggle("open");
    });

    const navItems = navMenu.querySelectorAll("a");
    navItems.forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.classList.remove("active");
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });


    navMenu.querySelectorAll(".nav-dropdown-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const dropdown = toggle.closest(".nav-dropdown");
        const isOpen = dropdown.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    });

    document.addEventListener("click", (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target) && navMenu.classList.contains("open")) {
        navToggle.classList.remove("active");
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("open")) {
        navToggle.classList.remove("active");
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
  }

  const sections = [
    { id: "our-mission", link: document.querySelector(".nav-link[href='#our-mission']") },
    { id: "our-programs", link: document.querySelector(".nav-link[href='#our-programs']") },
    { id: "our-service", link: document.querySelector(".nav-link[href='#our-service']") },
    { id: "footer", link: document.querySelector(".nav-link[href='#footer']") }
  ].filter(s => s.link && document.getElementById(s.id));

  function updateActiveLink() {
    const scrollPos = window.scrollY + 180;
    let currentId = null;
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i].id);
      if (el && el.offsetTop <= scrollPos) {
        currentId = sections[i].id;
        break;
      }
    }
    sections.forEach(({ id, link }) => {
      if (id === currentId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  updateActiveLink();

  const impactSlides = document.querySelectorAll(".impact-slide");
  const impactButtons = document.querySelectorAll(".impact-carousel-button");
  impactButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedSlide = Number(button.dataset.slide);
      impactSlides.forEach((slide, index) => {
        slide.classList.toggle("is-active", index === selectedSlide);
      });
      impactButtons.forEach((control, index) => {
        control.setAttribute("aria-pressed", String(index === selectedSlide));
      });
    });

  });

  const flipProgramCard = (card, shouldFlip) => {
    card.classList.toggle("is-flipped", shouldFlip);
    card.setAttribute("aria-expanded", String(shouldFlip));
  };

  document.querySelectorAll(".program-card-flip").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("form, input, button, a")) {
        return;
      }
      flipProgramCard(card, !card.classList.contains("is-flipped"));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flipProgramCard(card, !card.classList.contains("is-flipped"));
      }
    });
  });

  document.querySelectorAll("[data-program-target]").forEach((link) => {
    link.addEventListener("click", () => {
      const card = document.querySelector(`[data-program-card="${link.dataset.programTarget}"]`);
      if (!card) {
        return;
      }
      window.setTimeout(() => {
        flipProgramCard(card, true);
        card.focus({ preventScroll: true });
      }, 250);
    });
  });

  const inquiryModal = document.getElementById("inquiryModal");
  const inquiryModalTitle = document.getElementById("inquiryModalTitle");
  const inquiryModalDescription = document.getElementById("inquiryModalDescription");
  const inquiryForm = document.getElementById("programInquiryForm");
  const inquiryDetails = {
    Learn: "Ready to start trade training and certifications? Share one way to reach you and we will follow up about enrollment.",
    Train: "To begin Transitional Jobs or OJT, participants must first be verified through a career center and referred to a participating worksite. Share one way to reach you and we will help point you to the next step.",
    Build: "Interested in apprenticeship? Share one way to reach you and we will follow up with current pathway information and next steps."
  };

  document.querySelectorAll(".program-inquiry-button").forEach((button) => {
    button.addEventListener("click", () => {
      inquiryForm.elements.program.value = button.dataset.program;
      inquiryModalTitle.textContent = `${button.dataset.program} program inquiry`;
      inquiryModalDescription.textContent = inquiryDetails[button.dataset.program];
      inquiryForm.querySelector(".form-status").textContent = "";
      inquiryModal.hidden = false;
      document.body.classList.add("modal-open");
      inquiryForm.elements.name.focus();
    });
  });

  document.querySelectorAll("[data-inquiry-close]").forEach((control) => {
    control.addEventListener("click", () => {
      inquiryModal.hidden = true;
      document.body.classList.remove("modal-open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && inquiryModal && !inquiryModal.hidden) {
      inquiryModal.hidden = true;
      document.body.classList.remove("modal-open");
    }
  });

  inquiryForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = inquiryForm.querySelector(".form-status");
        const submit = inquiryForm.querySelector(".program-submit");
        const program = inquiryForm.elements.program.value;
        const formData = new FormData(inquiryForm);
        const name = String(formData.get("name") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const email = String(formData.get("email") || "").trim();
        if (!phone && !email) {
          status.textContent = "Please provide a phone number or email address.";
          return;
        }
        submit.disabled = true;
        status.textContent = "Sending your inquiry…";

        try {
          const response = await fetch(
            "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/(default)/documents/programInquiries",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: {
                  program: { stringValue: program },
                  tag: { stringValue: `program-${program.toLowerCase()}` },
                  name: { stringValue: name },
                  phone: { stringValue: phone },
                  email: { stringValue: email },
                  createdAt: { timestampValue: new Date().toISOString() }
                }
              })
            }
          );
          if (!response.ok) {
            throw new Error(`Inquiry submission failed with status ${response.status}.`);
          }
          inquiryForm.reset();
          status.textContent = "Thanks — your inquiry was received.";
        } catch (error) {
          console.error(error);
          status.textContent = "We could not submit this inquiry. Please try again.";
        } finally {
          submit.disabled = false;
        }
  });
});