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

    // ACCESSIBLE PROGRAM CARDS
  const flipProgramCard = (card, shouldFlip) => {
    card.classList.toggle("is-flipped", shouldFlip);
    card.setAttribute("aria-expanded", String(shouldFlip));
    const cardProgram = card.dataset.programCard || "program";
    const programTitle = cardProgram.charAt(0).toUpperCase() + cardProgram.slice(1);
    card.setAttribute("aria-label", shouldFlip ? `Hide details for ${programTitle}` : `Show details for ${programTitle}`);
    
    const frontFace = card.querySelector(".program-card-front");
    const backFace = card.querySelector(".program-card-back");
    if (frontFace && backFace) {
      frontFace.setAttribute("aria-hidden", String(shouldFlip));
      backFace.setAttribute("aria-hidden", String(!shouldFlip));
    }
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

  // MODAL FOCUS TRAPPING & ACCESSIBILITY MANAGEMENT
  let lastActiveModalTrigger = null;

  const openModalWithFocus = (modal, initialElement) => {
    lastActiveModalTrigger = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (initialElement && typeof initialElement.focus === "function") {
      initialElement.focus();
    }
  };

  const closeModalWithFocus = (modal) => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastActiveModalTrigger && typeof lastActiveModalTrigger.focus === "function") {
      lastActiveModalTrigger.focus();
      lastActiveModalTrigger = null;
    }
  };

  // Global trap for Tab and Escape across all modals
  document.addEventListener("keydown", (event) => {
    const activeModal = document.querySelector(".inquiry-modal:not([hidden])");
    if (!activeModal) return;

    if (event.key === "Escape") {
      closeModalWithFocus(activeModal);
      return;
    }

    if (event.key === "Tab") {
      const focusable = activeModal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        }
      } else {
        if (document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    }
  });

  // PROGRAM INQUIRY MODAL
  const inquiryModal = document.getElementById("inquiryModal");
  const inquiryModalTitle = document.getElementById("inquiryModalTitle");
  const inquiryModalDescription = document.getElementById("inquiryModalDescription");
  const inquiryForm = document.getElementById("programInquiryForm");
  const inquiryDetails = {
    Learn: "Ready to start trade training and certifications? Share one way to reach you and we will follow up about enrollment.",
    Train: "To begin Transitional Jobs or OJT, participants must first be verified through a career center and referred to a participating worksite. Share one way to reach you and we will help point you to the next step.",
    Build: "Interested in apprenticeship? Share one way to reach you and we will follow up with current pathway information and next steps."
  };

  if (inquiryModal && inquiryForm) {
    document.querySelectorAll(".program-inquiry-button").forEach((button) => {
      button.addEventListener("click", () => {
        inquiryForm.elements.program.value = button.dataset.program;
        inquiryModalTitle.textContent = `${button.dataset.program} program inquiry`;
        inquiryModalDescription.textContent = inquiryDetails[button.dataset.program] || "Share your contact details.";
        inquiryForm.querySelector(".form-status").textContent = "";
        openModalWithFocus(inquiryModal, inquiryForm.elements.name);
      });
    });

    document.querySelectorAll("[data-inquiry-close]").forEach((control) => {
      control.addEventListener("click", () => {
        closeModalWithFocus(inquiryModal);
      });
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
      status.textContent = "Sending your inquiry...";

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
  }

  // VOLUNTEER INTEREST INQUIRY MODAL (HARDENED - NO ARBITRARY DATES)
  const volunteerSignupModal = document.getElementById("volunteerSignupModal");
  const volunteerSignupForm = document.getElementById("volunteerSignupForm");

  if (volunteerSignupModal && volunteerSignupForm) {
    document.querySelectorAll(".event-signup-button").forEach((button) => {
      button.addEventListener("click", () => {
        volunteerSignupForm.querySelector(".form-status").textContent = "";
        const nameField = volunteerSignupForm.elements.name;
        openModalWithFocus(volunteerSignupModal, nameField);
      });
    });

    document.querySelectorAll("[data-volunteer-close]").forEach((control) => {
      control.addEventListener("click", () => {
        closeModalWithFocus(volunteerSignupModal);
      });
    });

    volunteerSignupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = volunteerSignupForm.querySelector(".form-status");
      const submit = volunteerSignupForm.querySelector(".program-submit");
      const formData = new FormData(volunteerSignupForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const availability = String(formData.get("availability") || "flexible").trim();
      const interest = String(formData.get("interest") || "general").trim();

      if (!phone && !email) {
        status.textContent = "Please provide a phone number or email address.";
        return;
      }
      submit.disabled = true;
      status.textContent = "Submitting your volunteer interest...";

      try {
        const response = await fetch(
          "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/(default)/documents/volunteerSignups",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                event: { stringValue: "General Volunteer Interest" },
                location: { stringValue: "Springboards Community Center" },
                availability: { stringValue: availability },
                interest: { stringValue: interest },
                name: { stringValue: name },
                phone: { stringValue: phone },
                email: { stringValue: email },
                createdAt: { timestampValue: new Date().toISOString() }
              }
            })
          }
        );
        if (!response.ok) {
          throw new Error(`Volunteer interest submission failed with status ${response.status}.`);
        }
        volunteerSignupForm.reset();
        status.textContent = "Thanks — your volunteer interest has been received. We will notify you when scheduled blocks open.";
      } catch (error) {
        console.error(error);
        status.textContent = "We could not save your submission. Please try again.";
      } finally {
        submit.disabled = false;
      }
    });
  }
});