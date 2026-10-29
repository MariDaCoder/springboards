// Springboards for Community Development - Client Logic
document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  // Ensure skip link reliably moves keyboard focus to #main-content
  const skipLink = document.querySelector(".skip-link");
  const mainContent = document.getElementById("main-content");
  if (skipLink && mainContent) {
    skipLink.addEventListener("click", () => {
      mainContent.focus();
    });
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;
      navToggle.setAttribute("aria-expanded", String(nextExpanded));
      navToggle.classList.toggle("active", nextExpanded);
      navMenu.classList.toggle("open", nextExpanded);
      if (nextExpanded) {
        const firstLink = navMenu.querySelector("a, button");
        if (firstLink && typeof firstLink.focus === "function") {
          firstLink.focus();
        }
      }
    });

    const navItems = navMenu.querySelectorAll("a, button");
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
      if (!navMenu.classList.contains("open")) return;
      if (e.key === "Escape") {
        navToggle.classList.remove("active");
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
        return;
      }
      if (e.key === "Tab") {
        const focusable = [navToggle, ...Array.from(navMenu.querySelectorAll("a, button:not([disabled])"))].filter(
          (el) => el && el.offsetParent !== null
        );
        if (focusable.length < 2) return;
        const firstItem = focusable[0];
        const lastItem = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === firstItem) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          firstItem.focus();
        }
      }
    });
  }

  const sections = [
    { id: "our-mission", link: document.querySelector(".nav-link[href='#our-mission']") },
    { id: "how-it-works", link: document.querySelector(".nav-link[href='#how-it-works']") },
    { id: "our-programs", link: document.querySelector(".nav-link[href='#our-programs']") },
    { id: "faq", link: document.querySelector(".nav-link[href='#faq']") },
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

    if (cardProgram === "train") {
      if (shouldFlip && typeof window._startTrainSlideShow === "function") {
        window._startTrainSlideShow();
      } else if (!shouldFlip && typeof window._stopTrainSlideShow === "function") {
        window._stopTrainSlideShow();
      }
    }
  };

  document.querySelectorAll(".program-card-flip").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("form, input, button, a, .train-slides-carousel")) {
        return;
      }
      flipProgramCard(card, !card.classList.contains("is-flipped"));
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        if (event.target.closest("form, input, button, a, .train-slides-carousel")) {
          return;
        }
        event.preventDefault();
        flipProgramCard(card, !card.classList.contains("is-flipped"));
      }
    });
  });

  // TRAIN PROGRAM FLIP SLIDE CAROUSEL & PRE-QUALIFICATION ACTION CONTROLLER
  const initTrainFlipSlider = () => {
    const carousel = document.getElementById("trainSlidesCarousel");
    if (!carousel) return;

    const track = document.getElementById("trainSlidesTrack");
    const frames = carousel.querySelectorAll(".train-slide-frame");
    const dots = carousel.querySelectorAll(".train-dot");
    const prevBtn = document.getElementById("trainSlidePrev");
    const nextBtn = document.getElementById("trainSlideNext");
    const counter = document.getElementById("trainCurrentSlideNum");
    const preQualBtn = document.getElementById("trainPreQualBtn");
    const notReadyLink = document.getElementById("trainNotReadyLink");
    const viewport = carousel.querySelector(".train-slides-viewport");
    const trainCard = document.querySelector('[data-program-card="train"]');

    let currentIndex = 0;
    const totalSlides = frames.length;
    let slideTimer = null;
    let linkTimer = null;

    const clearAllTimers = () => {
      if (slideTimer) {
        clearTimeout(slideTimer);
        slideTimer = null;
      }
      if (linkTimer) {
        clearTimeout(linkTimer);
        linkTimer = null;
      }
    };

    const updateSlider = (index, triggerAuto = false) => {
      currentIndex = Math.max(0, Math.min(index, totalSlides - 1));

      // Dynamically slide the 10 uploaded SVG slides to the left (each slide is 10% of the 1000% track)
      if (track) {
        track.style.transform = `translateX(-${currentIndex * 10}%)`;
      }

      // Update slide frames active states
      frames.forEach((frame, idx) => {
        const isActive = idx === currentIndex;
        frame.classList.toggle("active", isActive);
        frame.setAttribute("aria-hidden", String(!isActive));
      });

      // Update dot indicators
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIndex);
      });

      // Update slide counter
      if (counter) {
        counter.textContent = String(currentIndex + 1);
      }

      // Prev/Next button states
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex === totalSlides - 1;

      // Handle timing of Button and Link appearance
      if (currentIndex < totalSlides - 1) {
        // While browsing slides 1 through 9, keep button and link hidden
        if (preQualBtn) preQualBtn.classList.remove("is-visible");
        if (notReadyLink) notReadyLink.classList.remove("is-visible");

        if (triggerAuto) {
          clearAllTimers();
          // Hold each slide for 3 seconds, then dynamically slide left to next
          slideTimer = setTimeout(() => {
            updateSlider(currentIndex + 1, true);
          }, 3000);
        }
      } else {
        // Tenth slide reached!
        if (triggerAuto) {
          clearAllTimers();
          // "after tenth slide 3 secs complete the button appears link appears 1.5 seconds later"
          slideTimer = setTimeout(() => {
            if (preQualBtn) {
              preQualBtn.classList.add("is-visible");
            }
            linkTimer = setTimeout(() => {
              if (notReadyLink) {
                notReadyLink.classList.add("is-visible");
              }
            }, 1500);
          }, 3000);
        }
      }
    };

    const startPresentation = () => {
      clearAllTimers();
      if (preQualBtn) preQualBtn.classList.remove("is-visible");
      if (notReadyLink) notReadyLink.classList.remove("is-visible");
      updateSlider(0, true);
    };

    const stopPresentation = () => {
      clearAllTimers();
    };

    window._startTrainSlideShow = startPresentation;
    window._stopTrainSlideShow = stopPresentation;

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          updateSlider(currentIndex - 1, true);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex < totalSlides - 1) {
          updateSlider(currentIndex + 1, true);
        }
      });
    }

    // Advance on viewport click
    if (viewport) {
      viewport.addEventListener("click", (e) => {
        e.stopPropagation();
        if (currentIndex < totalSlides - 1) {
          updateSlider(currentIndex + 1, true);
        }
      });

      // Keyboard left/right arrow navigation
      viewport.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          if (currentIndex < totalSlides - 1) updateSlider(currentIndex + 1, true);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          if (currentIndex > 0) updateSlider(currentIndex - 1, true);
        }
      });

      // Touch / swipe support
      let touchStartX = 0;
      let touchStartY = 0;
      viewport.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      viewport.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0 && currentIndex < totalSlides - 1) {
            updateSlider(currentIndex + 1, true);
          } else if (diffX > 0 && currentIndex > 0) {
            updateSlider(currentIndex - 1, true);
          }
        }
      }, { passive: true });
    }

    // Direct dot navigation
    dots.forEach((dot, idx) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        updateSlider(idx, true);
      });
    });

    // Link under the button will go back to #our programs and replace text with No, I'm not ready yet.
    if (notReadyLink) {
      notReadyLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopPresentation();
        if (trainCard) {
          flipProgramCard(trainCard, false);
        }
        const programsSection = document.getElementById("our-programs");
        if (programsSection) {
          programsSection.scrollIntoView({ behavior: "smooth" });
        }
        if (window.location.hash !== "#our-programs") {
          history.pushState(null, "", "#our-programs");
        }
      });
    }

    // Also trigger start when hover over train card if not already flipped
    if (trainCard) {
      trainCard.addEventListener("mouseenter", () => {
        if (!slideTimer && !preQualBtn.classList.contains("is-visible")) {
          startPresentation();
        }
      });
    }

    // If card is already flipped on load, start presentation; otherwise initialize at slide 0
    if (trainCard && trainCard.classList.contains("is-flipped")) {
      startPresentation();
    } else {
      updateSlider(0, false);
    }
  };

  initTrainFlipSlider();

  // Handle jump links that specifically target a program card (Learn, Train, Build)
  document.querySelectorAll("[data-flip-target]").forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.dataset.flipTarget;
      const targetCard = document.querySelector(`[data-program-card="${target}"]`);
      if (targetCard) {
        setTimeout(() => {
          if (targetCard.classList.contains("program-card-flip")) {
            flipProgramCard(targetCard, true);
          }
          targetCard.focus();
        }, 350);
      }
    });
  });

  // MODAL FOCUS TRAPPING & ACCESSIBILITY MANAGEMENT
  let lastActiveModalTrigger = null;

  const openModalWithFocus = (modal, initialElement) => {
    const existingOpenModals = document.querySelectorAll(".inquiry-modal:not([hidden])");
    if (existingOpenModals.length === 0) {
      lastActiveModalTrigger = document.activeElement;
    } else {
      existingOpenModals.forEach((openModal) => {
        if (openModal !== modal) {
          openModal.hidden = true;
        }
      });
    }
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (initialElement && typeof initialElement.focus === "function") {
      initialElement.focus();
    }
  };

  const closeModalWithFocus = (modal) => {
    modal.hidden = true;
    const remainingOpen = document.querySelector(".inquiry-modal:not([hidden])");
    if (!remainingOpen) {
      document.body.classList.remove("modal-open");
      if (lastActiveModalTrigger && typeof lastActiveModalTrigger.focus === "function") {
        lastActiveModalTrigger.focus();
        lastActiveModalTrigger = null;
      }
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
      const candidates = Array.from(
        activeModal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const focusable = candidates.filter(
        (el) => !el.closest("[hidden]") && !el.classList.contains("sr-only-honeypot") && el.offsetParent !== null
      );
      if (!focusable.length) return;

      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstItem || !activeModal.contains(document.activeElement)) {
          event.preventDefault();
          lastItem.focus();
        }
      } else {
        if (document.activeElement === lastItem || !activeModal.contains(document.activeElement)) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    }
  });

  // Helper to announce form validation errors with non-color indicator + screen reader alert
  const setFormError = (statusEl, message, invalidFields = []) => {
    if (statusEl) {
      statusEl.classList.add("is-error");
      statusEl.setAttribute("role", "alert");
      statusEl.setAttribute("aria-live", "assertive");
      statusEl.textContent = `⚠ Error: ${message}`;
    }
    invalidFields.forEach((field, idx) => {
      if (field) {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");
        if (idx === 0 && typeof field.focus === "function") {
          field.focus();
        }
      }
    });
  };

  const clearFormErrorState = (formEl, statusEl) => {
    if (statusEl) {
      statusEl.classList.remove("is-error");
      statusEl.setAttribute("role", "status");
      statusEl.setAttribute("aria-live", "polite");
    }
    if (formEl) {
      formEl.querySelectorAll(".is-invalid, [aria-invalid='true']").forEach((el) => {
        el.classList.remove("is-invalid");
        el.removeAttribute("aria-invalid");
      });
    }
  };

  // PHONE AUTO-FORMATTING & VALIDATION HELPERS
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, "");
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  };

  const isValidPhone = (phone) => {
    if (!phone) return false;
    const digits = phone.replace(/[^\d]/g, "");
    return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
  };

  // Attach phone formatting mask to all tel inputs
  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener("input", (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      e.target.value = formatted;
      e.target.classList.remove("is-invalid");
    });
  });

  document.querySelectorAll('input[type="email"], input[type="text"]').forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.classList.remove("is-invalid");
      const form = e.target.closest("form");
      if (form) {
        const status = form.querySelector(".form-status");
        if (status) status.textContent = "";
      }
    });
  });

  // PROGRAM INQUIRY MODAL & CONFIRMATION
  const inquiryModal = document.getElementById("inquiryModal");
  const inquiryModalTitle = document.getElementById("inquiryModalTitle");
  const inquiryModalDescription = document.getElementById("inquiryModalDescription");
  const inquiryFormView = document.getElementById("inquiryFormView");
  const inquiryConfirmationScreen = document.getElementById("inquiryConfirmationScreen");
  const inquiryForm = document.getElementById("programInquiryForm");
  const inquiryDetails = {
    Learn: "Ready to start trade training and certifications? Share one way to reach you and we will follow up about enrollment.",
    Train: "To begin Transitional Jobs or OJT, participants must first be verified through a career center and referred to a participating worksite. Share one way to reach you and we will help point you to the next step.",
    Build: "Interested in apprenticeship? Share one way to reach you and we will follow up with current pathway information and next steps."
  };

  if (inquiryModal && inquiryForm) {
    document.querySelectorAll(".program-inquiry-button").forEach((button) => {
      button.addEventListener("click", () => {
        // Reset to form view
        inquiryForm.reset();
        inquiryFormView.hidden = false;
        inquiryConfirmationScreen.hidden = true;
        inquiryForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
        inquiryForm.elements.program.value = button.dataset.program;
        inquiryModalTitle.textContent = `${button.dataset.program} program inquiry`;
        inquiryModalDescription.textContent = inquiryDetails[button.dataset.program] || "Share your contact details.";
        const status = inquiryForm.querySelector(".form-status");
        status.textContent = "";
        status.classList.remove("is-error");
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
      if (submit.disabled || inquiryForm.dataset.submitting === "true") return;
      const program = inquiryForm.elements.program.value || "General";
      const formData = new FormData(inquiryForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();

      clearFormErrorState(inquiryForm, status);

      // 1. Validate Name
      if (!name || name.length < 2) {
        setFormError(status, "Please enter your full name, minimum 2 characters.", [inquiryForm.elements.name]);
        return;
      }

      // 2. Validate at least one contact method
      if (!phone && !email) {
        setFormError(status, "Please provide either a phone number or email address.", [inquiryForm.elements.phone, inquiryForm.elements.email]);
        return;
      }

      // 3. Validate Phone format if provided
      if (phone && !isValidPhone(phone)) {
        setFormError(status, "Please enter a valid 10-digit phone number (e.g. 555-123-4567).", [inquiryForm.elements.phone]);
        return;
      }

      // 4. Validate Email format if provided
      if (email && !isValidEmail(email)) {
        setFormError(status, "Please enter a valid email address, e.g. name@example.com.", [inquiryForm.elements.email]);
        return;
      }

      // Honeypot anti-spam check (silent deflection)
      const honeypot = formData.get("website_url");
      if (honeypot) {
        inquiryFormView.hidden = true;
        inquiryConfirmationScreen.hidden = false;
        inquiryForm.reset();
        return;
      }

      inquiryForm.dataset.submitting = "true";
      submit.disabled = true;
      status.textContent = "Sending your inquiry...";

      try {
        let delivered = false;
        // Attempt primary delivery via server proxy
        try {
          const res = await fetch("/api/inquiries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, email, program })
          });
          if (res.ok) {
            delivered = true;
          }
        } catch {
          // Server endpoint fallback
        }

        // Secondary fallback directly to Firestore REST API if needed
        if (!delivered) {
          const directRes = await fetch(
            "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/ai-studio-springboardsland-71046992-4c5a-4c20-bdcd-c5ee24b8cc0a/documents/programInquiries",
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
                  deliveredTo: { stringValue: "info@springboardsfcd.org" },
                  createdAt: { timestampValue: new Date().toISOString() }
                }
              })
            }
          );
          if (!directRes.ok) {
            throw new Error(`Inquiry submission failed with status ${directRes.status}.`);
          }
        }

        // Show Confirmation Screen
        inquiryFormView.hidden = true;
        inquiryConfirmationScreen.hidden = false;
        const confirmName = inquiryConfirmationScreen.querySelector(".confirm-name");
        const confirmProgram = inquiryConfirmationScreen.querySelector(".confirm-program");
        if (confirmName) confirmName.textContent = name;
        if (confirmProgram) confirmProgram.textContent = program;

        const doneButton = inquiryConfirmationScreen.querySelector(".confirmation-done-button");
        if (doneButton) doneButton.focus();

        inquiryForm.reset();
      } catch (error) {
        console.error(error);
        status.classList.add("is-error");
        status.textContent = "We could not deliver this inquiry right now. Please try again or email info@springboardsfcd.org.";
      } finally {
        delete inquiryForm.dataset.submitting;
        submit.disabled = false;
      }
    });
  }

  // VOLUNTEER INTEREST INQUIRY MODAL & CONFIRMATION
  const volunteerSignupModal = document.getElementById("volunteerSignupModal");
  const volunteerFormView = document.getElementById("volunteerFormView");
  const volunteerConfirmationScreen = document.getElementById("volunteerConfirmationScreen");
  const volunteerSignupForm = document.getElementById("volunteerSignupForm");

  if (volunteerSignupModal && volunteerSignupForm) {
    document.querySelectorAll(".event-signup-button").forEach((button) => {
      button.addEventListener("click", () => {
        volunteerSignupForm.reset();
        volunteerFormView.hidden = false;
        volunteerConfirmationScreen.hidden = true;
        volunteerSignupForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
        const status = volunteerSignupForm.querySelector(".form-status");
        status.textContent = "";
        status.classList.remove("is-error");
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
      if (submit.disabled || volunteerSignupForm.dataset.submitting === "true") return;
      const formData = new FormData(volunteerSignupForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const availability = String(formData.get("availability") || "flexible").trim();
      const interest = String(formData.get("interest") || "general").trim();
      const organization = String(formData.get("organization") || "").trim();

      clearFormErrorState(volunteerSignupForm, status);

      // 1. Validate Name
      if (!name || name.length < 2) {
        setFormError(status, "Please enter your full name, minimum 2 characters.", [volunteerSignupForm.elements.name]);
        return;
      }

      // 2. Validate at least one contact method
      if (!phone && !email) {
        setFormError(status, "Please provide either a phone number or email address.", [volunteerSignupForm.elements.phone, volunteerSignupForm.elements.email]);
        return;
      }

      // 3. Validate Phone format if provided
      if (phone && !isValidPhone(phone)) {
        setFormError(status, "Please enter a valid 10-digit phone number (e.g. 555-123-4567).", [volunteerSignupForm.elements.phone]);
        return;
      }

      // 4. Validate Email format if provided
      if (email && !isValidEmail(email)) {
        setFormError(status, "Please enter a valid email address, e.g. name@example.com.", [volunteerSignupForm.elements.email]);
        return;
      }

      // Honeypot anti-spam check (silent deflection)
      const honeypot = formData.get("website_url");
      if (honeypot) {
        volunteerFormView.hidden = true;
        volunteerConfirmationScreen.hidden = false;
        volunteerSignupForm.reset();
        return;
      }

      volunteerSignupForm.dataset.submitting = "true";
      submit.disabled = true;
      status.textContent = "Submitting your volunteer interest...";

      try {
        let delivered = false;
        try {
          const res = await fetch("/api/volunteer-signups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, email, availability, interest, organization })
          });
          if (res.ok) {
            delivered = true;
          }
        } catch {
          // Server endpoint fallback
        }

        if (!delivered) {
          const directRes = await fetch(
            "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/ai-studio-springboardsland-71046992-4c5a-4c20-bdcd-c5ee24b8cc0a/documents/volunteerSignups",
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
                  deliveredTo: { stringValue: "info@springboardsfcd.org" },
                  createdAt: { timestampValue: new Date().toISOString() }
                }
              })
            }
          );
          if (!directRes.ok) {
            throw new Error(`Volunteer interest submission failed with status ${directRes.status}.`);
          }
        }

        // Show Confirmation Screen
        volunteerFormView.hidden = true;
        volunteerConfirmationScreen.hidden = false;
        const confirmName = volunteerConfirmationScreen.querySelector(".confirm-name");
        const confirmInterest = volunteerConfirmationScreen.querySelector(".confirm-interest");
        if (confirmName) confirmName.textContent = name;
        if (confirmInterest) {
          const interestLabels = {
            "cleaning-demo": "cleaning and demo support",
            "tools-prep": "tools and safety preparation",
            "community-outreach": "community outreach",
            "general": "general community support"
          };
          confirmInterest.textContent = interestLabels[interest] || interest;
        }

        const doneButton = volunteerConfirmationScreen.querySelector(".confirmation-done-button");
        if (doneButton) doneButton.focus();

        volunteerSignupForm.reset();
      } catch (error) {
        console.error(error);
        status.classList.add("is-error");
        status.textContent = "We could not save your submission. Please try again or email info@springboardsfcd.org.";
      } finally {
        delete volunteerSignupForm.dataset.submitting;
        submit.disabled = false;
      }
    });
  }

  // PRIVACY POLICY & TERMS MODAL
  const privacyModal = document.getElementById("privacyModal");
  const openPrivacyBtn = document.getElementById("openPrivacyModal");
  if (privacyModal && openPrivacyBtn) {
    openPrivacyBtn.addEventListener("click", () => {
      openModalWithFocus(privacyModal, privacyModal.querySelector(".btn-cta"));
    });
    privacyModal.querySelectorAll("[data-privacy-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeModalWithFocus(privacyModal);
      });
    });
  }

  // CANDIDATE INTAKE MODAL
  const candidateModal = document.getElementById("candidateModal");
  const candidateFormView = document.getElementById("candidateFormView");
  const candidateConfirmationScreen = document.getElementById("candidateConfirmationScreen");
  const candidateForm = document.getElementById("candidateApplicationForm");

  const openCandidateModal = (defaultTrade) => {
    if (!candidateModal || !candidateForm) return;
    candidateForm.reset();
    candidateFormView.hidden = false;
    candidateConfirmationScreen.hidden = true;
    const isPrequalification = new URLSearchParams(window.location.search).get("start") === "prequalification";
    const candidateTitle = document.getElementById("candidateModalTitle");
    const candidateIntro = candidateFormView.querySelector(".modal-subtext");
    if (isPrequalification) {
      if (candidateTitle) candidateTitle.textContent = "Transitional Jobs Pre-Qualification";
      if (candidateIntro) candidateIntro.textContent = "Answer a few questions so our team can help identify your next steps toward training and work.";
    }
    candidateForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
    const status = candidateForm.querySelector(".form-status");
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
    if (defaultTrade && candidateForm.elements.trade) {
      candidateForm.elements.trade.value = defaultTrade;
    }
    const nameField = candidateForm.elements.name;
    openModalWithFocus(candidateModal, nameField);
  };

  document.querySelectorAll(".btn-candidate-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const defaultTrade = btn.dataset.tradeDefault || "Carpentry & Construction Technology";
      openCandidateModal(defaultTrade);
    });
  });

  if (new URLSearchParams(window.location.search).get("start") === "prequalification") {
    openCandidateModal("Carpentry & Construction Technology");
  }

  if (candidateModal && candidateForm) {
    candidateModal.querySelectorAll("[data-candidate-close]").forEach((control) => {
      control.addEventListener("click", () => {
        closeModalWithFocus(candidateModal);
      });
    });

    candidateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = candidateForm.querySelector(".form-status");
      const submit = candidateForm.querySelector(".program-submit");
      if (submit.disabled || candidateForm.dataset.submitting === "true") return;
      const formData = new FormData(candidateForm);

      // Honeypot check
      if (formData.get("website_url")) {
        candidateFormView.hidden = true;
        candidateConfirmationScreen.hidden = false;
        candidateForm.reset();
        return;
      }

      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const trade = String(formData.get("trade") || "Carpentry & Construction Technology").trim();
      const backgroundStatus = String(formData.get("backgroundStatus") || "").trim();
      const transportation = String(formData.get("transportation") || "").trim();
      const careerCenter = String(formData.get("careerCenter") || "").trim();
      const notes = String(formData.get("notes") || "").trim();

      clearFormErrorState(candidateForm, status);

      if (!name || name.length < 2) {
        setFormError(status, "Please enter your full legal name (minimum 2 characters).", [candidateForm.elements.name]);
        return;
      }

      if (!phone && !email) {
        setFormError(status, "Please provide either a phone number or email address so we can reach you.", [candidateForm.elements.phone, candidateForm.elements.email]);
        return;
      }

      if (phone && !isValidPhone(phone)) {
        setFormError(status, "Please enter a valid 10-digit phone number, e.g. (334) 556-1234.", [candidateForm.elements.phone]);
        return;
      }

      if (email && !isValidEmail(email)) {
        setFormError(status, "Please enter a valid email address (e.g. name@example.com).", [candidateForm.elements.email]);
        return;
      }

      candidateForm.dataset.submitting = "true";
      submit.disabled = true;
      status.textContent = "Submitting candidate application...";

      try {
        let delivered = false;
        try {
          const res = await fetch("/api/candidates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone, email, trade, backgroundStatus, transportation, careerCenter, notes })
          });
          if (res.ok) delivered = true;
        } catch {}

        if (!delivered) {
          // Direct fallback to Firestore REST
          await fetch(
            "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/ai-studio-springboardsland-71046992-4c5a-4c20-bdcd-c5ee24b8cc0a/documents/candidateApplications",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: {
                  name: { stringValue: name },
                  phone: { stringValue: phone },
                  email: { stringValue: email },
                  trade: { stringValue: trade },
                  backgroundStatus: { stringValue: backgroundStatus },
                  transportation: { stringValue: transportation },
                  careerCenter: { stringValue: careerCenter },
                  notes: { stringValue: notes },
                  createdAt: { timestampValue: new Date().toISOString() }
                }
              })
            }
          ).catch(() => {});
        }

        candidateFormView.hidden = true;
        candidateConfirmationScreen.hidden = false;
        const confirmName = candidateConfirmationScreen.querySelector(".confirm-name");
        const confirmTrade = candidateConfirmationScreen.querySelector(".confirm-trade");
        if (confirmName) confirmName.textContent = name;
        if (confirmTrade) confirmTrade.textContent = trade;
        const doneBtn = candidateConfirmationScreen.querySelector(".confirmation-done-button");
        if (doneBtn) doneBtn.focus();
        candidateForm.reset();
      } catch (err) {
        console.error(err);
        status.classList.add("is-error");
        status.textContent = "Could not submit application. Please call 615-603-1157 or email info@springboardsfcd.org.";
      } finally {
        delete candidateForm.dataset.submitting;
        submit.disabled = false;
      }
    });
  }

  // BUSINESS & EMPLOYER PARTNERSHIP MODAL
  const partnerModal = document.getElementById("partnerModal");
  const partnerFormView = document.getElementById("partnerFormView");
  const partnerConfirmationScreen = document.getElementById("partnerConfirmationScreen");
  const partnerForm = document.getElementById("partnerApplicationForm");

  const openPartnerModal = () => {
    if (!partnerModal || !partnerForm) return;
    partnerForm.reset();
    partnerFormView.hidden = false;
    partnerConfirmationScreen.hidden = true;
    partnerForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
    const status = partnerForm.querySelector(".form-status");
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
    const companyField = partnerForm.elements.companyName;
    openModalWithFocus(partnerModal, companyField);
  };

  document.querySelectorAll(".btn-partner-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openPartnerModal();
    });
  });

  if (partnerModal && partnerForm) {
    partnerModal.querySelectorAll("[data-partner-close]").forEach((control) => {
      control.addEventListener("click", () => {
        closeModalWithFocus(partnerModal);
      });
    });

    partnerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = partnerForm.querySelector(".form-status");
      const submit = partnerForm.querySelector(".program-submit");
      if (submit.disabled || partnerForm.dataset.submitting === "true") return;
      const formData = new FormData(partnerForm);

      if (formData.get("website_url")) {
        partnerFormView.hidden = true;
        partnerConfirmationScreen.hidden = false;
        partnerForm.reset();
        return;
      }

      const companyName = String(formData.get("companyName") || "").trim();
      const contactName = String(formData.get("contactName") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const partnershipType = String(formData.get("partnershipType") || "Host Worksite").trim();
      const tradeSpecialty = String(formData.get("tradeSpecialty") || "General").trim();
      const message = String(formData.get("message") || "").trim();

      clearFormErrorState(partnerForm, status);

      if (!companyName || companyName.length < 2) {
        setFormError(status, "Please provide your company or organization name.", [partnerForm.elements.companyName]);
        return;
      }

      if (!contactName || contactName.length < 2) {
        setFormError(status, "Please provide a contact person name.", [partnerForm.elements.contactName]);
        return;
      }

      if (!phone && !email) {
        setFormError(status, "Please provide either a phone number or business email address.", [partnerForm.elements.phone, partnerForm.elements.email]);
        return;
      }

      if (phone && !isValidPhone(phone)) {
        setFormError(status, "Please enter a valid 10-digit phone number.", [partnerForm.elements.phone]);
        return;
      }

      if (email && !isValidEmail(email)) {
        setFormError(status, "Please enter a valid business email address.", [partnerForm.elements.email]);
        return;
      }

      partnerForm.dataset.submitting = "true";
      submit.disabled = true;
      status.textContent = "Submitting partnership inquiry...";

      try {
        let delivered = false;
        try {
          const res = await fetch("/api/partnerships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyName, contactName, phone, email, partnershipType, tradeSpecialty, message })
          });
          if (res.ok) delivered = true;
        } catch {}

        partnerFormView.hidden = true;
        partnerConfirmationScreen.hidden = false;
        const confirmName = partnerConfirmationScreen.querySelector(".confirm-name");
        const confirmCompany = partnerConfirmationScreen.querySelector(".confirm-company");
        if (confirmName) confirmName.textContent = contactName;
        if (confirmCompany) confirmCompany.textContent = companyName;

        const doneBtn = partnerConfirmationScreen.querySelector(".confirmation-done-button");
        if (doneBtn) doneBtn.focus();

        partnerForm.reset();
      } catch (err) {
        console.error(err);
        status.classList.add("is-error");
        status.textContent = "Could not submit inquiry. Please call 615-603-1157 or email info@springboardsfcd.org.";
      } finally {
        delete partnerForm.dataset.submitting;
        submit.disabled = false;
      }
    });
  }

  // DONATION & GIVING CENTER MODAL
  const donateModal = document.getElementById("donateModal");
  const donateFormView = document.getElementById("donateFormView");
  const donateConfirmationScreen = document.getElementById("donateConfirmationScreen");
  const donateForm = document.getElementById("donationPledgeForm");

  const openDonateModal = () => {
    if (!donateModal || !donateForm) return;
    donateForm.reset();
    donateFormView.hidden = false;
    donateConfirmationScreen.hidden = true;
    donateForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
    const status = donateForm.querySelector(".form-status");
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error");
    }
    const donorField = donateForm.elements.donorName;
    openModalWithFocus(donateModal, donorField);
  };

  document.querySelectorAll(".btn-donate-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDonateModal();
    });
  });

  if (donateModal && donateForm) {
    donateModal.querySelectorAll("[data-donate-close]").forEach((control) => {
      control.addEventListener("click", () => {
        closeModalWithFocus(donateModal);
      });
    });

    donateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const status = donateForm.querySelector(".form-status");
      const submit = donateForm.querySelector(".program-submit");
      if (submit.disabled || donateForm.dataset.submitting === "true") return;
      const formData = new FormData(donateForm);

      if (formData.get("website_url")) {
        donateFormView.hidden = true;
        donateConfirmationScreen.hidden = false;
        donateForm.reset();
        return;
      }

      const donorName = String(formData.get("donorName") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const donationType = String(formData.get("donationType") || "financial_sponsorship").trim();
      const pledgeAmount = String(formData.get("pledgeAmount") || "Custom").trim();
      const message = String(formData.get("message") || "").trim();
      const taxReceiptRequested = formData.get("taxReceiptRequested") === "yes";

      clearFormErrorState(donateForm, status);

      if (!donorName || donorName.length < 2) {
        setFormError(status, "Please enter your full name or organization name.", [donateForm.elements.donorName]);
        return;
      }

      if (!email || !isValidEmail(email)) {
        setFormError(status, "Please provide a valid email address so we can issue your tax acknowledgment.", [donateForm.elements.email]);
        return;
      }

      if (phone && !isValidPhone(phone)) {
        setFormError(status, "Please enter a valid 10-digit phone number.", [donateForm.elements.phone]);
        return;
      }

      donateForm.dataset.submitting = "true";
      submit.disabled = true;
      status.textContent = "Recording your pledge...";

      try {
        let delivered = false;
        try {
          const res = await fetch("/api/donations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ donorName, phone, email, donationType, pledgeAmount, message, taxReceiptRequested })
          });
          if (res.ok) delivered = true;
        } catch {}

        donateFormView.hidden = true;
        donateConfirmationScreen.hidden = false;
        const confirmName = donateConfirmationScreen.querySelector(".confirm-name");
        if (confirmName) confirmName.textContent = donorName;

        const doneBtn = donateConfirmationScreen.querySelector(".confirmation-done-button");
        if (doneBtn) doneBtn.focus();

        donateForm.reset();
      } catch (err) {
        console.error(err);
        status.classList.add("is-error");
        status.textContent = "Could not record pledge. Please contact info@springboardsfcd.org.";
      } finally {
        delete donateForm.dataset.submitting;
        submit.disabled = false;
      }
    });
  }

  // DOCUMENT CENTER & DOWNLOAD HUB MODAL
  const documentModal = document.getElementById("documentModal");
  const docPreviewContainer = document.getElementById("docPreviewContainer");
  const docPreviewImg = document.getElementById("docPreviewImg");
  const docPreviewTitle = document.getElementById("docPreviewTitle");
  const docPreviewDownloadBtn = document.getElementById("docPreviewDownloadBtn");
  const closeDocPreviewBtn = document.getElementById("closeDocPreviewBtn");

  const docAssetMap = {
    "springboards-community-flyer": {
      title: "Springboards Community Flyer & Volunteer Schedule",
      preview: "/springboards-community-flyer.webp",
      download: "/springboards flyer 1.jpg",
      filename: "Springboards_Community_Flyer.jpg"
    }
  };

  const openDocumentCenter = (previewDocId) => {
    if (!documentModal) return;
    openModalWithFocus(documentModal, documentModal.querySelector(".btn-cta"));
    if (previewDocId && docAssetMap[previewDocId]) {
      showDocPreview(previewDocId);
    } else if (docPreviewContainer) {
      docPreviewContainer.style.display = "none";
    }
  };

  const showDocPreview = (docId) => {
    const asset = docAssetMap[docId];
    if (!asset || !docPreviewContainer || !docPreviewImg) return;
    docPreviewTitle.textContent = asset.title;
    docPreviewImg.src = asset.preview;
    docPreviewImg.alt = asset.title;
    if (docPreviewDownloadBtn) {
      docPreviewDownloadBtn.href = asset.download;
      docPreviewDownloadBtn.download = asset.filename;
    }
    docPreviewContainer.style.display = "block";
    docPreviewContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  document.querySelectorAll(".btn-doc-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const docId = btn.dataset.docView || null;
      openDocumentCenter(docId);
    });
  });

  document.querySelectorAll(".btn-view-doc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const docId = btn.dataset.docView;
      showDocPreview(docId);
    });
  });

  if (closeDocPreviewBtn) {
    closeDocPreviewBtn.addEventListener("click", () => {
      if (docPreviewContainer) docPreviewContainer.style.display = "none";
    });
  }

  if (documentModal) {
    documentModal.querySelectorAll("[data-doc-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeModalWithFocus(documentModal);
      });
    });
  }

  // BACK TO TOP FLOATING BUTTON
  const backToTopBtn = document.getElementById("backToTop");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        backToTopBtn.hidden = false;
        backToTopBtn.classList.add("is-visible");
      } else {
        backToTopBtn.classList.remove("is-visible");
      }
    }, { passive: true });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // TOAST NOTIFICATION HELPER
  const toast = document.getElementById("toastNotification");
  let toastTimer = null;
  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    // Force reflow for animation
    void toast.offsetWidth;
    toast.classList.add("is-active");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-active");
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 3200);
  };

  // COMMUNITY SHARE PAGE TRIGGER
  const shareBtn = document.getElementById("sharePageButton");
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Springboards for Community Development",
            text: "WIOA authorized trade training and career pathways: based in Shawmut, Alabama, serving East Alabama.",
            url: window.location.href
          });
        } catch {
          // Cancelled by user
        }
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast("Page link copied to clipboard!");
        } catch {
          showToast("Visit springboardsfcd.org to share!");
        }
      } else {
        showToast("Visit springboardsfcd.org to share!");
      }
    });
  }

  // =========================================================================
  // TRAINEE PROFILE CREATION & PROGRAM-PATH CUSTOMIZED JOURNEY ROADMAP
  // =========================================================================
  const profileJourneyModal = document.getElementById("profileJourneyModal");
  const profileCreationView = document.getElementById("profileCreationView");
  const profileJourneyGeneratedView = document.getElementById("profileJourneyGeneratedView");
  const profileCreationForm = document.getElementById("profileCreationForm");
  const profileProgramPathSelector = document.getElementById("profileProgramPathSelector");
  const editTraineeProfileBtn = document.getElementById("editTraineeProfileBtn");
  const generatedProfileBannerTag = document.getElementById("generatedProfileBannerTag");
  const generatedProfileHeading = document.getElementById("generatedProfileHeading");
  const generatedProfileSubtext = document.getElementById("generatedProfileSubtext");
  const roadmapPathBadgePill = document.getElementById("roadmapPathBadgePill");
  const roadmapMainHeading = document.getElementById("roadmapMainHeading");
  const roadmapMainSubdesc = document.getElementById("roadmapMainSubdesc");
  const inquiryOpenJourneyBtn = document.getElementById("inquiryOpenJourneyBtn");
  const candidateOpenJourneyBtn = document.getElementById("candidateOpenJourneyBtn");

  // Program-Path Specific 5-Stage Journey Definitions
  const PROGRAM_PATH_JOURNEYS = {
    "Carpentry & Construction Technology": {
      label: "Carpentry & Construction Technology Path",
      badge: "CARPENTRY & CONSTRUCTION PATHWAY",
      heading: "Carpentry & Structural Framing Journey",
      subdesc: "195-hour NCCER Carpentry lab + up to 390 paid worksite hours on residential & community builds in Shawmut and Lanett.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Center WIOA", time: "Week 1" },
        { name: "3. Carpentry & Framing Lab", time: "195 Hours" },
        { name: "4. Paid Framing Worksite", time: "390 Hours" },
        { name: "5. Contractor Placement", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • CARPENTRY PROFILE & INTAKE",
          title: "Carpentry Track Enrollment & Tool Readiness",
          desc: "Your trainee profile is registered for Carpentry & Construction Technology. Your Springboards advisor reviews your schedule, transit plan, and steel-toe boot/PPE sizing.",
          checklist: [
            "Carpentry & Construction Technology track assigned to your profile",
            "1-on-1 intake review with Springboards Carpentry instructor",
            "Photo ID, work authorization & PPE sizing verification"
          ],
          outcome: "Carpentry Trainee Profile Active & Advisor Assigned",
          classroomTag: "📚 Google Classroom: Carpentry Orientation & Shop Safety Module"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER VERIFICATION",
          title: "Guided WIOA & Career Center Verification",
          desc: "Our team coordinates with your nearest Alabama Career Center (Valley, Opelika, or Phenix City) to confirm WIOA Transitional Jobs & OJT eligibility.",
          checklist: [
            "Guided referral to Valley, Opelika, or Phenix City Career Center",
            "WIOA Activity 220 Transitional Jobs & OJT clearance",
            "Supportive service issuance (framing tool belt, work boots & PPE)"
          ],
          outcome: "Official WIOA Worksite Referral & Tool Belt Issued",
          classroomTag: "📚 Google Classroom: Construction Math, Tape Measure & Blueprint Basics"
        },
        {
          stageBadge: "STAGE 3 • CARPENTRY & SAFETY LAB (195 HOURS)",
          title: "Hands-On Framing, Drywall & Power Tool Mastery",
          desc: "Complete 195 hours of NCCER Carpentry instruction and supervised shop builds at the Springboards Community Center (Mon–Thu, 8:00 AM – 4:00 PM).",
          checklist: [
            "OSHA-10 Construction Safety & fall protection certification",
            "Floor, wall, and roof framing layout & circular/miter saw safety",
            "Exterior sheathing, window/door hanging, drywall & trim carpentry"
          ],
          outcome: "OSHA-10 Card & NCCER Carpentry Level 1 Readiness",
          classroomTag: "📚 Google Classroom: 195-Hour NCCER Carpentry & Framing Lab"
        },
        {
          stageBadge: "STAGE 4 • PAID CARPENTRY WORKSITE (UP TO 390 HOURS)",
          title: "Earn While You Build on Community Rehab Crews",
          desc: "Transition onto supervised framing and rehabilitation crews for up to 390 paid hours (32 hrs/wk), building real structures in Lanett and Chambers County.",
          checklist: [
            "Up to 390 hours of paid carpentry worksite experience (32 hrs/wk)",
            "Supervised structural framing, decking, and interior finish builds",
            "Verified Sirius Workforce attendance & crew leader evaluations"
          ],
          outcome: "390 Hours Verified Carpentry Worksite Experience",
          classroomTag: "📚 Google Classroom: Daily Framing Crew Logs & Quality Checks"
        },
        {
          stageBadge: "STAGE 5 • FULL-TIME CARPENTRY PLACEMENT",
          title: "Launch Into a Commercial or Residential Carpentry Career",
          desc: "Graduate directly into full-time employment with regional general contractors, residential framing crews, or OJT employer partners across East Alabama.",
          checklist: [
            "Direct placement matching with East Alabama general contractors",
            "OJT wage-reimbursement onboarding or apprenticeship sponsorship",
            "90-day post-placement retention check-ins and career mentorship"
          ],
          outcome: "Full-Time Carpenter / Framing Technician Placement",
          classroomTag: "📚 Google Classroom: Carpentry Capstone Portfolio & Employer Hire"
        }
      ]
    },
    "Electrical & Wiring": {
      label: "Electrical & Wiring Fundamentals Path",
      badge: "ELECTRICAL & WIRING PATHWAY",
      heading: "Electrical Fundamentals & Conduit Journey",
      subdesc: "195-hour NEC & NCCER Electrical lab + up to 390 paid worksite hours wiring training panels and community renovations.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Center WIOA", time: "Week 1" },
        { name: "3. Electrical & NEC Lab", time: "195 Hours" },
        { name: "4. Paid Wiring Worksite", time: "390 Hours" },
        { name: "5. Electrical Placement", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • ELECTRICAL PROFILE & INTAKE",
          title: "Electrical Track Enrollment & Safety Intake",
          desc: "Your trainee profile is configured for Electrical & Wiring. Your advisor reviews your math/circuit readiness and issues your insulated PPE checklist.",
          checklist: [
            "Electrical & Wiring pathway locked into your trainee profile",
            "1-on-1 electrical aptitude & career goal consultation",
            "Document readiness review for Career Center clearance"
          ],
          outcome: "Electrical Trainee Profile Active & Advisor Assigned",
          classroomTag: "📚 Google Classroom: Electrical Safety & Lockout/Tagout (LOTO) Intro"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER VERIFICATION",
          title: "WIOA Eligibility & Insulated Tool Kit Clearance",
          desc: "Coordinate with the Alabama Career Center to activate WIOA funding and supportive services for your electrical training kit and multimeters.",
          checklist: [
            "Alabama Career Center WIOA Adult/Youth verification",
            "Electrical PPE & voltage tester supportive service screening",
            "Worksite co-enrollment clearance for paid electrical hours"
          ],
          outcome: "WIOA Clearance & Electrical Starter Kit Approved",
          classroomTag: "📚 Google Classroom: Ohm's Law & AC/DC Circuit Theory"
        },
        {
          stageBadge: "STAGE 3 • ELECTRICAL & SAFETY LAB (195 HOURS)",
          title: "Breaker Panels, Conduit Bending & Circuit Diagnostics",
          desc: "Master residential and commercial wiring on live trainer bays at the Lanett campus, covering National Electrical Code (NEC) standards and OSHA-10.",
          checklist: [
            "OSHA-10 electrical hazard recognition & Lockout/Tagout (LOTO)",
            "EMT conduit bending, junction boxes, switches & GFCI receptacles",
            "200A service breaker panel wiring & digital multimeter testing"
          ],
          outcome: "OSHA-10 Card & NCCER Electrical Level 1 Credential",
          classroomTag: "📚 Google Classroom: 195-Hour NEC Wiring & Breaker Panel Lab"
        },
        {
          stageBadge: "STAGE 4 • PAID ELECTRICAL WORKSITE (UP TO 390 HOURS)",
          title: "Supervised Rough-In & Facility Electrical Upgrades",
          desc: "Earn hourly wages for up to 390 hours installing lighting, branch circuits, and conduit on supervised community facility builds.",
          checklist: [
            "Up to 390 hours paid electrical rough-in & trim-out experience",
            "Troubleshoot circuits and install LED fixtures under master supervision",
            "Verified jobsite safety & NEC code compliance sign-offs"
          ],
          outcome: "390 Hours Verified Electrical Apprentice Experience",
          classroomTag: "📚 Google Classroom: Electrical Worksite Inspection Logs"
        },
        {
          stageBadge: "STAGE 5 • FULL-TIME ELECTRICAL PLACEMENT",
          title: "Placement With Electrical Contractors & Industrial Maintenance",
          desc: "Transition into full-time apprentice electrician roles or industrial facility maintenance positions across Chambers, Lee, and Troup Counties.",
          checklist: [
            "Interviews with licensed electrical contractors & industrial plants",
            "OJT employer wage-reimbursement or IBEW/IEC apprenticeship credit",
            "Long-term journeyman licensure pathway advising"
          ],
          outcome: "Full-Time Electrical Apprentice / Maintenance Placement",
          classroomTag: "📚 Google Classroom: Electrical Portfolio & Contractor Matching"
        }
      ]
    },
    "Plumbing & Pipefitting": {
      label: "Plumbing & Pipefitting Systems Path",
      badge: "PLUMBING & PIPEFITTING PATHWAY",
      heading: "Plumbing, Piping & Mechanical Systems Journey",
      subdesc: "195-hour NCCER Plumbing lab + up to 390 paid worksite hours installing PEX, copper, PVC drainage, and commercial fixtures.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Center WIOA", time: "Week 1" },
        { name: "3. Plumbing & Pipe Lab", time: "195 Hours" },
        { name: "4. Paid Piping Worksite", time: "390 Hours" },
        { name: "5. Plumbing Placement", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • PLUMBING PROFILE & INTAKE",
          title: "Plumbing & Pipefitting Track Enrollment",
          desc: "Your trainee profile is set to Plumbing & Pipefitting. Meet with your Springboards advisor to map out your lab schedule and career goals.",
          checklist: [
            "Plumbing & Pipefitting track selected in trainee profile",
            "Advisor intake review & transportation planning",
            "Identification & Career Center referral checklist"
          ],
          outcome: "Plumbing Trainee Profile Active & Advisor Assigned",
          classroomTag: "📚 Google Classroom: Plumbing Tools & Pipe Material Identification"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER VERIFICATION",
          title: "Guided Career Center & WIOA Co-Enrollment",
          desc: "Complete your Alabama Career Center verification for WIOA Transitional Jobs and supportive services.",
          checklist: [
            "Valley / Opelika Career Center WIOA eligibility verification",
            "PPE, eye/hand protection & work boot voucher clearance",
            "Official referral to Springboards Lanett training worksite"
          ],
          outcome: "WIOA Plumbing Pathway Clearance Confirmed",
          classroomTag: "📚 Google Classroom: Isometric Pipe Drawings & Grade Math"
        },
        {
          stageBadge: "STAGE 3 • PLUMBING & PIPEFITTING LAB (195 HOURS)",
          title: "Copper Soldering, PEX Crimp & DWV Drainage Systems",
          desc: "Train hands-on in our Lanett plumbing shop on supply lines, drain-waste-vent (DWV) slope layout, pressure testing, and fixture installation.",
          checklist: [
            "OSHA-10 trenching, confined space & torch safety protocols",
            "Copper sweating/soldering, PEX crimping & CPVC/PVC solvent welding",
            "Water heater, vanity, commode & commercial valve installation"
          ],
          outcome: "OSHA-10 Card & NCCER Plumbing Level 1 Readiness",
          classroomTag: "📚 Google Classroom: 195-Hour NCCER Plumbing & DWV Lab"
        },
        {
          stageBadge: "STAGE 4 • PAID PLUMBING WORKSITE (UP TO 390 HOURS)",
          title: "Paid Rough-In & Fixture Installation Crew",
          desc: "Complete up to 390 paid hours roughing in supply/drain lines and setting fixtures on supervised community rehabilitation projects.",
          checklist: [
            "Up to 390 hours paid plumbing & pipefitting worksite experience",
            "Supervised pressure testing, leak diagnostics & fixture trim-out",
            "Verified Sirius Workforce attendance & supervisor evaluations"
          ],
          outcome: "390 Hours Verified Plumbing & Pipefitting Experience",
          classroomTag: "📚 Google Classroom: Plumbing Pressure-Test & Worksite Logs"
        },
        {
          stageBadge: "STAGE 5 • FULL-TIME PLUMBING PLACEMENT",
          title: "Launch Into Service Plumbing or Commercial Pipefitting",
          desc: "Move directly into full-time apprentice plumber or mechanical pipefitter roles with regional mechanical contractors and municipal utilities.",
          checklist: [
            "Direct hiring introductions to regional plumbing & mechanical firms",
            "State apprentice plumber registration guidance",
            "Post-placement mentorship and wage progression tracking"
          ],
          outcome: "Full-Time Plumbing Apprentice / Pipefitter Placement",
          classroomTag: "📚 Google Classroom: Plumbing Capstone & Employer Placement"
        }
      ]
    },
    "HVAC & Mechanical": {
      label: "HVAC & Mechanical Systems Path",
      badge: "HVAC & MECHANICAL PATHWAY",
      heading: "HVAC, Airflow & EPA 608 Certification Journey",
      subdesc: "195-hour HVAC & EPA Section 608 prep lab + up to 390 paid worksite hours servicing heat pumps, ductwork, and controls.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Center WIOA", time: "Week 1" },
        { name: "3. HVAC & EPA 608 Lab", time: "195 Hours" },
        { name: "4. Paid HVAC Worksite", time: "390 Hours" },
        { name: "5. HVAC Tech Placement", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • HVAC PROFILE & INTAKE",
          title: "HVAC & Mechanical Systems Enrollment",
          desc: "Your trainee profile is customized for HVAC & Mechanical Systems. Connect with your advisor to review EPA 608 exam goals and lab hours.",
          checklist: [
            "HVAC & Mechanical Systems pathway assigned to your profile",
            "1-on-1 advisor intake & scheduling confirmation",
            "Document readiness review for WIOA verification"
          ],
          outcome: "HVAC Trainee Profile Active & Advisor Assigned",
          classroomTag: "📚 Google Classroom: Thermodynamics & Refrigeration Cycle Intro"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER VERIFICATION",
          title: "WIOA Verification & EPA Testing Support",
          desc: "Partner with the Alabama Career Center to verify WIOA eligibility and unlock supportive services for gauges, PPE, and certification fees.",
          checklist: [
            "Alabama Career Center WIOA Adult/Youth eligibility sign-off",
            "Supportive service clearance for PPE and EPA 608 testing",
            "Official referral to Springboards HVAC training cohort"
          ],
          outcome: "WIOA Clearance & EPA 608 Exam Track Activated",
          classroomTag: "📚 Google Classroom: EPA Section 608 Core & Refrigerant Safety"
        },
        {
          stageBadge: "STAGE 3 • HVAC & MECHANICAL LAB (195 HOURS)",
          title: "Refrigerant Recovery, Brazing, Ductwork & Controls",
          desc: "Complete 195 hours of hands-on HVAC instruction covering manifold gauges, copper brazing, sheet-metal/flex ductwork, and low-voltage thermostats.",
          checklist: [
            "EPA Section 608 Universal certification prep & OSHA-10 safety",
            "Manifold gauge diagnostics, vacuum pump evacuation & brazing",
            "Split-system heat pump wiring, blower motors & duct airflow balancing"
          ],
          outcome: "EPA 608 Readiness, OSHA-10 & NCCER HVAC Level 1",
          classroomTag: "📚 Google Classroom: 195-Hour HVAC Diagnostics & EPA 608 Lab"
        },
        {
          stageBadge: "STAGE 4 • PAID HVAC WORKSITE (UP TO 390 HOURS)",
          title: "Paid Climate Control Installation & Maintenance Crew",
          desc: "Earn wages for up to 390 hours installing ductwork, servicing condensing units, and performing preventative maintenance on community facilities.",
          checklist: [
            "Up to 390 hours paid HVAC installation & maintenance experience",
            "Supervised filter/coil service, thermostat wiring & duct sealing",
            "Verified Sirius Workforce attendance & technician evaluations"
          ],
          outcome: "390 Hours Verified HVAC Field Service Experience",
          classroomTag: "📚 Google Classroom: HVAC Commissioning & Service Logs"
        },
        {
          stageBadge: "STAGE 5 • FULL-TIME HVAC PLACEMENT",
          title: "Launch Into Full-Time HVAC Installer or Service Tech Role",
          desc: "Step into permanent employment with East Alabama residential/commercial HVAC companies or facility maintenance departments.",
          checklist: [
            "Direct interviews with regional HVAC contractors & facility teams",
            "OJT employer wage-reimbursement placement support",
            "Ongoing career coaching toward senior technician certifications"
          ],
          outcome: "Full-Time HVAC Installer / Service Technician Placement",
          classroomTag: "📚 Google Classroom: HVAC Capstone & Employer Hire"
        }
      ]
    },
    "Demolition & Site Preparation": {
      label: "Demolition, Safety & Site Preparation Path",
      badge: "DEMOLITION & SITE PREP PATHWAY",
      heading: "Site Preparation, Structural Strip-Out & Safety Journey",
      subdesc: "195-hour OSHA safety & heavy tool lab + up to 390 paid worksite hours on community blight removal and site readiness crews.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Center WIOA", time: "Week 1" },
        { name: "3. OSHA & Site Prep Lab", time: "195 Hours" },
        { name: "4. Paid Site Prep Crew", time: "390 Hours" },
        { name: "5. Civil/Site Placement", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • SITE PREP PROFILE & INTAKE",
          title: "Demolition & Site Preparation Enrollment",
          desc: "Your profile is configured for Demolition & Site Preparation. Your advisor reviews your PPE needs and fast-track crew schedule.",
          checklist: [
            "Demolition & Site Preparation track saved to your profile",
            "1-on-1 intake interview & transit coordination",
            "Document verification for Career Center referral"
          ],
          outcome: "Site Prep Profile Active & Crew Advisor Assigned",
          classroomTag: "📚 Google Classroom: Jobsite Hazard Recognition & PPE Standards"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER VERIFICATION",
          title: "WIOA Transitional Jobs Clearance",
          desc: "Complete guided Career Center verification to unlock WIOA Activity 220 paid worksite hours and heavy-duty safety gear.",
          checklist: [
            "Valley / Opelika Career Center WIOA verification",
            "Hard hat, respirator, steel-toe boots & high-vis gear issuance",
            "Worksite referral for paid community revitalization crews"
          ],
          outcome: "WIOA Site Prep Referral & Full PPE Issued",
          classroomTag: "📚 Google Classroom: Environmental Safety, Lead/Asbestos Awareness"
        },
        {
          stageBadge: "STAGE 3 • SAFETY & SITE PREP LAB (195 HOURS)",
          title: "Selective Demolition, Shoring & Heavy Tool Operation",
          desc: "Build jobsite mastery in structural strip-out, material salvage, skid-steer/equipment spotter safety, and OSHA-10/30 protocols.",
          checklist: [
            "OSHA-10/30 construction safety, silica dust & fall protection",
            "Safe operation of reciprocating saws, rotary hammers & pry tools",
            "Utility shutoff verification, debris sorting & site grading basics"
          ],
          outcome: "OSHA Safety Credential & Site Prep Qualification",
          classroomTag: "📚 Google Classroom: 195-Hour Site Prep & Selective Demo Lab"
        },
        {
          stageBadge: "STAGE 4 • PAID SITE PREP WORKSITE (UP TO 390 HOURS)",
          title: "Paid Community Revitalization & Site Readiness Crew",
          desc: "Work up to 390 paid hours (32 hrs/wk Mon–Thu) preparing properties in Lanett and Shawmut for renovation and new construction.",
          checklist: [
            "Up to 390 hours paid site prep & selective demolition work",
            "Teamwork, daily safety briefings (Toolbox Talks) & crew leadership",
            "Verified Sirius Workforce timekeeping & supervisor references"
          ],
          outcome: "390 Hours Verified Site Prep & Crew Experience",
          classroomTag: "📚 Google Classroom: Daily Toolbox Talk & Site Progress Logs"
        },
        {
          stageBadge: "STAGE 5 • FULL-TIME SITE & CIVIL PLACEMENT",
          title: "Transition Into Commercial Site Work or Civil Construction",
          desc: "Move directly into full-time roles with civil grading contractors, commercial demolition firms, or municipal public works departments.",
          checklist: [
            "Employer matching with regional civil & commercial contractors",
            "OJT placement or heavy equipment operator pathway referrals",
            "Ongoing post-placement retention support"
          ],
          outcome: "Full-Time Site Prep / Construction Specialist Placement",
          classroomTag: "📚 Google Classroom: Site Prep Capstone & Employer Placement"
        }
      ]
    },
    Learn: {
      label: "Learn Path — 195-Hour Classroom & Craft Credentials",
      badge: "LEARN PATHWAY • 195-HOUR CREDENTIALS",
      heading: "Accelerated Classroom, Shop & Certification Journey",
      subdesc: "Focused 195-hour blended Google Classroom and hands-on shop curriculum leading to OSHA-10 and NCCER craft credentials.",
      stepLabels: [
        { name: "1. Profile & Intake", time: "Completed" },
        { name: "2. Career Alignment", time: "Week 1" },
        { name: "3. Core NCCER & OSHA", time: "95 Hours" },
        { name: "4. Specialty Craft Lab", time: "100 Hours" },
        { name: "5. Credential & Referral", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • LEARN PATH PROFILE & INTAKE",
          title: "195-Hour Credential Track Enrollment",
          desc: "Your profile is customized for the Learn Path. We align your schedule for Monday–Thursday instruction at the Lanett campus.",
          checklist: [
            "Learn Path (195-Hour Credential Track) assigned to your profile",
            "Google Classroom student account & syllabus activation",
            "Advisor intake & learning goals review"
          ],
          outcome: "Learn Path Profile Active & Google Classroom Provisioned",
          classroomTag: "📚 Google Classroom: NCCER Core Orientation & Digital Syllabus"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER & SUPPORT ALIGNMENT",
          title: "Training Sponsorship & PPE Issuance",
          desc: "Verify eligibility with our intake team and Alabama Career Center partners so 100% of your tuition, books, and tools are covered.",
          checklist: [
            "100% tuition-free grant & Career Center verification",
            "Personal protective equipment (ANSI Z87.1 glasses, boots, gloves)",
            "Baseline trade skills assessment"
          ],
          outcome: "Full Tuition Waiver & Shop PPE Kit Issued",
          classroomTag: "📚 Google Classroom: Construction Math & Blueprint Reading"
        },
        {
          stageBadge: "STAGE 3 • NCCER CORE & OSHA-10 LAB (95 HOURS)",
          title: "Jobsite Safety, Hand/Power Tools & Blueprints",
          desc: "Complete the first 95 hours covering OSHA-10 construction safety, tape/laser measurement, rigging basics, and power tool operation.",
          checklist: [
            "Complete 10-hour OSHA Construction Safety certification",
            "Pass NCCER Core modules: hand tools, power tools & blueprints",
            "Daily hands-on shop station checkoffs in Google Keep & Classroom"
          ],
          outcome: "Official OSHA-10 Card & NCCER Core Completion",
          classroomTag: "📚 Google Classroom: OSHA-10 & NCCER Core Module Assessments"
        },
        {
          stageBadge: "STAGE 4 • SPECIALTY TRADE LAB ROTATION (100 HOURS)",
          title: "Deep-Dive Carpentry, Electrical, Plumbing & HVAC Stations",
          desc: "Spend 100 hours rotating through specialized trade bays to build a multi-craft project portfolio.",
          checklist: [
            "Hands-on framing, wiring, copper/PEX piping, and HVAC trainer builds",
            "Instructor competency sign-offs on shop capstone project",
            "Mock interviews and resume preparation with career advisors"
          ],
          outcome: "195-Hour Craft Certificate & Multi-Trade Portfolio",
          classroomTag: "📚 Google Classroom: Specialty Craft Lab Evaluations"
        },
        {
          stageBadge: "STAGE 5 • WORKSITE TRANSITION OR EMPLOYER REFERRAL",
          title: "Advance to 390-Hour Paid Worksite or Direct Hire",
          desc: "Upon completing your 195 classroom/lab hours, step directly into our 390-hour paid transitional worksite crew or interview with local employers.",
          checklist: [
            "Priority advancement into 390-hour Paid Transitional Worksite",
            "Direct referrals to Chambers County & East Alabama employers",
            "Verified NCCER & OSHA credential transcript packet"
          ],
          outcome: "Credentialed Trade Graduate Ready for Paid Work",
          classroomTag: "📚 Google Classroom: Graduate Credential Packet & Next Steps"
        }
      ]
    },
    Train: {
      label: "Train Path — WIOA 390-Hour Paid Transitional Worksite",
      badge: "TRAIN PATHWAY • WIOA TRANSITIONAL JOBS",
      heading: "WIOA Paid Transitional Worksite Journey (390 Hours)",
      subdesc: "Designed for returning citizens, opportunity youth, and jobseekers ready to earn hourly wages while building verified trade experience.",
      stepLabels: [
        { name: "1. Profile & Pre-Qual", time: "Completed" },
        { name: "2. WIOA Activity 220", time: "Week 1" },
        { name: "3. Safety & Lab Prep", time: "195 Hours" },
        { name: "4. Paid Crew (32h/wk)", time: "390 Hours" },
        { name: "5. Permanent Retention", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • TRAIN PATH PROFILE & PRE-QUALIFICATION",
          title: "Transitional Jobs Profile & Barrier Assessment",
          desc: "Your profile is configured for the WIOA Transitional Jobs (Train) pathway. Our advisor identifies any ID, transit, or scheduling needs.",
          checklist: [
            "Train Path (WIOA Transitional Jobs) selected in profile",
            "Barrier-removal review (transportation, ID, work clothing)",
            "Pre-referral coordination packet prepared"
          ],
          outcome: "Transitional Jobs Candidate Profile Verified",
          classroomTag: "📚 Google Classroom: Worksite Expectations & Timekeeping Intro"
        },
        {
          stageBadge: "STAGE 2 • ALABAMA CAREER CENTER WIOA REFERRAL",
          title: "WIOA Activity 220 Eligibility & Worksite Referral",
          desc: "To begin Transitional Jobs, participants are verified through an Alabama Career Center (Valley, Opelika, or Phenix City) and referred to Springboards.",
          checklist: [
            "Official Career Center WIOA Activity 220 verification",
            "Worksite Agreement & payroll onboarding completion",
            "Supportive services activated for boots, tools, and transit"
          ],
          outcome: "Official Career Center Referral & Payroll Onboarding",
          classroomTag: "📚 Google Classroom: WIOA Worksite Onboarding Checklist"
        },
        {
          stageBadge: "STAGE 3 • TECHNICAL & SAFETY READINESS (195 HOURS)",
          title: "Jobsite Safety, Tool Mastery & Crew Protocols",
          desc: "Build core safety and technical competence at the Springboards Community Center so you step onto the worksite confident and OSHA-compliant.",
          checklist: [
            "OSHA-10 safety certification & daily PPE inspection routines",
            "Supervised shop practice with saws, drills, levels, and meters",
            "Team communication, reliability, and jobsite ethics"
          ],
          outcome: "Cleared for Active Paid Worksite Deployment",
          classroomTag: "📚 Google Classroom: 195-Hour Pre-Worksite Technical Modules"
        },
        {
          stageBadge: "STAGE 4 • PAID TRANSITIONAL WORKSITE (UP TO 390 HOURS)",
          title: "32 Hours/Week Paid Work Experience (Mon–Thu, 8 AM–4 PM)",
          desc: "Work alongside experienced supervisors on real community construction and renovation builds while earning dependable weekly wages.",
          checklist: [
            "Up to 390 paid worksite hours (32 hours/week Monday–Thursday)",
            "Verified Sirius Workforce digital clock-in/clock-out tracking",
            "Bi-weekly competency & work-habit evaluations for future employers"
          ],
          outcome: "390 Hours Verified Employment History & Earned Wages",
          classroomTag: "📚 Google Classroom: Sirius Timekeeping & Crew Evaluations"
        },
        {
          stageBadge: "STAGE 5 • UNSUBSIDIZED EMPLOYMENT OR OJT TRANSITION",
          title: "Graduate Into Permanent Full-Time Trade Employment",
          desc: "Leverage your 390 hours of verified work history and supervisor recommendations to step directly into permanent full-time employment.",
          checklist: [
            "Supervisor reference letter & verified 390-hour competency transcript",
            "Transition into OJT employer placement or full-time retention",
            "Continued mentorship during your first 90 days on the job"
          ],
          outcome: "Permanent Unsubsidized Full-Time Trade Career",
          classroomTag: "📚 Google Classroom: Transition Portfolio & Employer Placement"
        }
      ]
    },
    Build: {
      label: "Build Path — Employer OJT & Registered Apprenticeship",
      badge: "BUILD PATHWAY • OJT & APPRENTICESHIP",
      heading: "On-the-Job Training (OJT) & Apprenticeship Journey",
      subdesc: "Direct pathway connecting trained candidates with East Alabama trade employers offering wage-reimbursed OJT and long-term apprenticeships.",
      stepLabels: [
        { name: "1. Profile & Skills Audit", time: "Completed" },
        { name: "2. OJT Career Center", time: "Week 1" },
        { name: "3. Employer Matching", time: "Weeks 2–3" },
        { name: "4. Paid OJT Contract", time: "On-the-Job" },
        { name: "5. Journeyman Track", time: "Career Launch" }
      ],
      stages: [
        {
          stageBadge: "STAGE 1 • BUILD PATH PROFILE & SKILLS AUDIT",
          title: "Apprenticeship & OJT Candidate Profile",
          desc: "Your profile is configured for the Build Path (OJT & Apprenticeship). We catalog your existing trade skills, certifications, and career targets.",
          checklist: [
            "Build Path (OJT & Apprenticeship) saved to your profile",
            "Trade competency & certification audit with placement advisor",
            "Resume & trade portfolio alignment"
          ],
          outcome: "OJT / Apprenticeship Candidate Profile Ready",
          classroomTag: "📚 Google Classroom: Apprenticeship Readiness & Interview Prep"
        },
        {
          stageBadge: "STAGE 2 • CAREER CENTER OJT VOUCHER CLEARANCE",
          title: "WIOA On-the-Job Training (OJT) Eligibility",
          desc: "Coordinate with the Alabama Career Center to qualify for WIOA OJT wage reimbursement (which reimburses partnering employers 50%–75% of wages during training).",
          checklist: [
            "Career Center OJT eligibility & employer incentive letter",
            "Drug-free workplace & driver/transit readiness check",
            "Specialized trade tool kit verification"
          ],
          outcome: "OJT Wage-Reimbursement Letter Issued for Employers",
          classroomTag: "📚 Google Classroom: OJT Training Plan & Competency Matrix"
        },
        {
          stageBadge: "STAGE 3 • EMPLOYER INTERVIEWS & SHOP DEMONSTRATION",
          title: "Direct Matching With Regional Trade Contractors",
          desc: "Complete targeted skill refreshers at the Lanett shop and interview directly with partnering electrical, plumbing, HVAC, and carpentry contractors.",
          checklist: [
            "Hands-on skill verification in the Springboards trade shop",
            "1-on-1 interviews with Chambers & Lee County employer partners",
            "Custom OJT Individual Training Plan (ITP) signed with employer"
          ],
          outcome: "Job Offer & Signed OJT / Apprenticeship Training Plan",
          classroomTag: "📚 Google Classroom: Employer Skill Demonstration Rubric"
        },
        {
          stageBadge: "STAGE 4 • PAID ON-THE-JOB TRAINING & MENTORSHIP",
          title: "Full-Time Paid Employment With Structured Skill Milestones",
          desc: "Work full-time on your employer's crew while Springboards and WIOA advisors track your competency milestones and support your progression.",
          checklist: [
            "Full-time wages from Day 1 on employer payroll",
            "Structured on-the-job skill sign-offs with master tradesperson",
            "Monthly check-ins with Springboards workforce advisor"
          ],
          outcome: "Verified OJT Skill Mastery & Wage Progression",
          classroomTag: "📚 Google Classroom: Monthly OJT Milestone Check-Ins"
        },
        {
          stageBadge: "STAGE 5 • LONG-TERM APPRENTICESHIP & JOURNEYMAN CAREER",
          title: "Permanent Retention & Advanced Trade Licensure",
          desc: "Complete your OJT contract as a permanent full-time employee and continue advancing toward journeyman licensure or crew supervision.",
          checklist: [
            "OJT completion certificate & permanent employer retention",
            "Advanced NCCER / state licensure exam guidance",
            "Alumni network connection & future mentor opportunities"
          ],
          outcome: "Permanent Skilled Trade Career & Apprenticeship Advancement",
          classroomTag: "📚 Google Classroom: Alumni Licensure & Leadership Resources"
        }
      ]
    }
  };

  let activeTraineeProfile = null;
  let currentStepIndex = 0;
  const completedSteps = new Set([0]);

  const roadmapRoot = document.getElementById("participantJourneyRoadmap");
  const stepItems = roadmapRoot ? Array.from(roadmapRoot.querySelectorAll(".journey-step-item")) : [];
  const statusLabel = document.getElementById("roadmapStatusLabel");
  const percentValue = document.getElementById("roadmapPercentValue");
  const meterBar = document.getElementById("roadmapMeterBar");
  const meterFill = document.getElementById("roadmapMeterFill");
  const trackProgress = document.getElementById("roadmapTrackProgress");
  const detailPanel = document.getElementById("roadmapDetailPanel");
  const detailStageBadge = document.getElementById("roadmapDetailStageBadge");
  const detailStatePill = document.getElementById("roadmapDetailStatePill");
  const detailTitle = document.getElementById("roadmapDetailTitle");
  const detailDesc = document.getElementById("roadmapDetailDesc");
  const detailChecklist = document.getElementById("roadmapDetailChecklist");
  const detailOutcome = document.getElementById("roadmapDetailOutcome");
  const detailClassroomTag = document.getElementById("roadmapDetailClassroomTag");
  const advanceBtn = document.getElementById("roadmapAdvanceBtn");
  const completeAllBtn = document.getElementById("roadmapCompleteAllBtn");
  const resetBtn = document.getElementById("roadmapResetBtn");

  const escapeSafe = (str) =>
    String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));

  const resolveProgramPathKey = (rawPath) => {
    const val = String(rawPath || "").trim();
    if (PROGRAM_PATH_JOURNEYS[val]) return val;
    if (/electr/i.test(val)) return "Electrical & Wiring";
    if (/plumb|pipe/i.test(val)) return "Plumbing & Pipefitting";
    if (/hvac|mech/i.test(val)) return "HVAC & Mechanical";
    if (/demo|site/i.test(val)) return "Demolition & Site Preparation";
    if (/^learn$/i.test(val)) return "Learn";
    if (/^train$/i.test(val)) return "Train";
    if (/^build$/i.test(val)) return "Build";
    return "Carpentry & Construction Technology";
  };

  const getActiveJourneyConfig = () => {
    const key = resolveProgramPathKey(activeTraineeProfile?.programPath);
    return PROGRAM_PATH_JOURNEYS[key] || PROGRAM_PATH_JOURNEYS["Carpentry & Construction Technology"];
  };

  const renderRoadmap = (animateDetail = true) => {
    if (!roadmapRoot) return;
    const journeyConfig = getActiveJourneyConfig();
    const roadmapStages = journeyConfig.stages;
    const completedCount = completedSteps.size;
    const totalSteps = roadmapStages.length;
    const pct = Math.min(100, Math.max(20, Math.round(((completedCount || 0.8) / totalSteps) * 100)));
    const displayPct =
      completedCount === totalSteps ? 100 : completedCount === 0 ? 20 : Math.round((completedCount / totalSteps) * 100);

    if (roadmapPathBadgePill) roadmapPathBadgePill.textContent = journeyConfig.badge;
    if (roadmapMainHeading) roadmapMainHeading.textContent = journeyConfig.heading;
    if (roadmapMainSubdesc) roadmapMainSubdesc.textContent = journeyConfig.subdesc;

    if (statusLabel) {
      statusLabel.textContent =
        completedCount === totalSteps
          ? "All 5 Stages Completed! 🎉"
          : `Stage ${currentStepIndex + 1} of ${totalSteps} Active (${completedCount} Completed)`;
    }
    if (percentValue) {
      percentValue.textContent = `${displayPct}% Complete`;
    }
    if (meterBar) {
      meterBar.setAttribute("aria-valuenow", String(displayPct));
    }
    if (meterFill) {
      meterFill.style.width = `${pct}%`;
    }

    if (trackProgress) {
      const highestTarget = Math.max(currentStepIndex, completedCount > 0 ? Math.max(...completedSteps) : 0);
      const trackPct = Math.min(100, Math.round((highestTarget / (totalSteps - 1)) * 100));
      trackProgress.style.width = `${trackPct}%`;
    }

    stepItems.forEach((item, idx) => {
      const isDone = completedSteps.has(idx);
      const isCurrent = idx === currentStepIndex;
      item.classList.toggle("is-completed", isDone);
      item.classList.toggle("is-current", isCurrent && !isDone);
      item.classList.toggle("is-upcoming", !isDone && !isCurrent);

      const btn = item.querySelector(".journey-step-btn");
      const statusTag = item.querySelector(".journey-step-status-tag");
      const stepNameEl = item.querySelector(".journey-step-name");
      const stepTimeEl = item.querySelector(".journey-step-time");
      const stepMeta = journeyConfig.stepLabels?.[idx];

      if (stepMeta) {
        if (stepNameEl) stepNameEl.textContent = stepMeta.name;
        if (stepTimeEl) stepTimeEl.textContent = stepMeta.time;
      }
      if (btn) {
        if (isCurrent) {
          btn.setAttribute("aria-current", "step");
        } else {
          btn.removeAttribute("aria-current");
        }
      }
      if (statusTag) {
        statusTag.textContent = isDone ? "Completed ✓" : isCurrent ? "In Progress" : "Upcoming";
      }
    });

    const stage = roadmapStages[currentStepIndex] || roadmapStages[0];
    const isStageDone = completedSteps.has(currentStepIndex);

    const updateDetailDOM = () => {
      if (detailStageBadge) detailStageBadge.textContent = stage.stageBadge;
      if (detailStatePill) {
        detailStatePill.textContent = isStageDone ? "Stage Completed ✓" : "In Progress";
        detailStatePill.classList.toggle("is-done", isStageDone);
      }
      if (detailTitle) detailTitle.textContent = stage.title;
      if (detailDesc) detailDesc.textContent = stage.desc;
      if (detailChecklist) {
        detailChecklist.innerHTML = stage.checklist
          .map(
            (point) => `
            <li class="journey-check-item">
              <span class="journey-check-bullet" aria-hidden="true">✓</span>
              <span>${escapeSafe(point)}</span>
            </li>`
          )
          .join("");
      }
      if (detailOutcome) detailOutcome.textContent = stage.outcome;
      if (detailClassroomTag) detailClassroomTag.textContent = stage.classroomTag;

      if (advanceBtn) {
        if (completedSteps.size === totalSteps) {
          advanceBtn.textContent = "Journey Complete — Submit Official Application →";
        } else if (currentStepIndex < totalSteps - 1) {
          advanceBtn.textContent = `Complete Stage ${currentStepIndex + 1} & Advance →`;
        } else {
          advanceBtn.textContent = "Complete Final Placement Stage ✓";
        }
      }
    };

    if (animateDetail && detailPanel) {
      detailPanel.classList.add("is-transitioning");
      setTimeout(() => {
        updateDetailDOM();
        detailPanel.classList.remove("is-transitioning");
      }, 160);
    } else {
      updateDetailDOM();
    }
  };

  const generateAndShowProfileJourneyScreen = (profileData) => {
    const resolvedPath = resolveProgramPathKey(profileData?.programPath);
    activeTraineeProfile = {
      name: String(profileData?.name || "Springboards Trainee").trim(),
      contact: String(profileData?.contact || "").trim(),
      programPath: resolvedPath,
      careerCenterStatus: String(profileData?.careerCenterStatus || "Need Guided Career Center Verification").trim()
    };

    const journeyConfig = getActiveJourneyConfig();

    // Mark Stage 1 (Profile & Intake) completed; if already registered with Career Center, also mark Stage 2!
    completedSteps.clear();
    completedSteps.add(0);
    if (/Already Registered|Registered with AL Works/i.test(activeTraineeProfile.careerCenterStatus)) {
      completedSteps.add(1);
      currentStepIndex = 2;
    } else {
      currentStepIndex = 1;
    }

    if (generatedProfileBannerTag) {
      generatedProfileBannerTag.textContent = `PROFILE ACTIVE • ${activeTraineeProfile.name.toUpperCase()}`;
    }
    if (generatedProfileHeading) {
      generatedProfileHeading.textContent = `${activeTraineeProfile.name}'s Customized Journey — ${journeyConfig.label}`;
    }
    if (generatedProfileSubtext) {
      generatedProfileSubtext.textContent = `Career Center Status: ${activeTraineeProfile.careerCenterStatus}${
        activeTraineeProfile.contact ? ` • Contact: ${activeTraineeProfile.contact}` : ""
      }`;
    }
    if (profileProgramPathSelector) {
      profileProgramPathSelector.value = resolvedPath;
    }

    if (profileCreationView) profileCreationView.hidden = true;
    if (profileJourneyGeneratedView) profileJourneyGeneratedView.hidden = false;

    renderRoadmap(false);

    if (profileJourneyModal && profileJourneyModal.hidden) {
      openModalWithFocus(profileJourneyModal, profileProgramPathSelector || advanceBtn);
    }
  };

  // Wire up step buttons, advance, complete all, and reset inside #participantJourneyRoadmap
  if (roadmapRoot) {
    stepItems.forEach((item, idx) => {
      const btn = item.querySelector(".journey-step-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          currentStepIndex = idx;
          renderRoadmap(true);
        });
      }
    });

    if (advanceBtn) {
      advanceBtn.addEventListener("click", () => {
        const stages = getActiveJourneyConfig().stages;
        if (completedSteps.size === stages.length) {
          if (profileJourneyModal) closeModalWithFocus(profileJourneyModal);
          openCandidateModal(activeTraineeProfile?.programPath || "Carpentry & Construction Technology");
          return;
        }
        completedSteps.add(currentStepIndex);
        if (currentStepIndex < stages.length - 1) {
          currentStepIndex += 1;
        }
        renderRoadmap(true);
      });
    }

    if (completeAllBtn) {
      completeAllBtn.addEventListener("click", () => {
        const stages = getActiveJourneyConfig().stages;
        stages.forEach((_, idx) => completedSteps.add(idx));
        currentStepIndex = stages.length - 1;
        renderRoadmap(true);
        showToast("All 5 customized program journey stages marked complete!");
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        completedSteps.clear();
        completedSteps.add(0);
        currentStepIndex = 1;
        renderRoadmap(true);
      });
    }

    renderRoadmap(false);
  }

  // Open Profile Creation / Custom Journey Modal from any .btn-profile-journey-trigger button
  document.querySelectorAll(".btn-profile-journey-trigger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!profileJourneyModal) return;
      if (activeTraineeProfile) {
        if (profileCreationView) profileCreationView.hidden = true;
        if (profileJourneyGeneratedView) profileJourneyGeneratedView.hidden = false;
        renderRoadmap(false);
        openModalWithFocus(profileJourneyModal, profileProgramPathSelector);
      } else {
        if (profileCreationView) profileCreationView.hidden = false;
        if (profileJourneyGeneratedView) profileJourneyGeneratedView.hidden = true;
        openModalWithFocus(profileJourneyModal, profileCreationForm?.elements?.profileName);
      }
    });
  });

  if (profileJourneyModal) {
    profileJourneyModal.querySelectorAll("[data-profile-journey-close]").forEach((ctrl) => {
      ctrl.addEventListener("click", () => {
        closeModalWithFocus(profileJourneyModal);
      });
    });
  }

  if (editTraineeProfileBtn) {
    editTraineeProfileBtn.addEventListener("click", () => {
      if (profileCreationView) profileCreationView.hidden = false;
      if (profileJourneyGeneratedView) profileJourneyGeneratedView.hidden = true;
      if (profileCreationForm && activeTraineeProfile) {
        if (profileCreationForm.elements.profileName) {
          profileCreationForm.elements.profileName.value = activeTraineeProfile.name || "";
        }
        if (profileCreationForm.elements.profileContact) {
          profileCreationForm.elements.profileContact.value = activeTraineeProfile.contact || "";
        }
        if (profileCreationForm.elements.programPath) {
          profileCreationForm.elements.programPath.value = activeTraineeProfile.programPath || "Carpentry & Construction Technology";
        }
      }
    });
  }

  if (profileProgramPathSelector) {
    profileProgramPathSelector.addEventListener("change", () => {
      const selectedPath = resolveProgramPathKey(profileProgramPathSelector.value);
      if (!activeTraineeProfile) {
        activeTraineeProfile = {
          name: "Springboards Trainee",
          contact: "",
          programPath: selectedPath,
          careerCenterStatus: "Need Guided Career Center Verification"
        };
      } else {
        activeTraineeProfile.programPath = selectedPath;
      }
      const journeyConfig = getActiveJourneyConfig();
      if (generatedProfileHeading) {
        generatedProfileHeading.textContent = `${activeTraineeProfile.name}'s Customized Journey — ${journeyConfig.label}`;
      }
      renderRoadmap(true);
      showToast(`Journey customized for ${journeyConfig.label}`);
    });
  }

  if (profileCreationForm) {
    profileCreationForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("profileCreationStatus");
      const formData = new FormData(profileCreationForm);
      const name = String(formData.get("profileName") || "").trim();
      const contact = String(formData.get("profileContact") || "").trim();
      const programPath = String(formData.get("programPath") || "Carpentry & Construction Technology").trim();
      const careerCenterStatus = String(formData.get("careerCenterStatus") || "Need Guided Career Center Verification").trim();

      if (!name || name.length < 2) {
        if (statusEl) {
          statusEl.classList.add("is-error");
          statusEl.textContent = "Please enter your full name (minimum 2 characters).";
        }
        return;
      }
      if (!contact) {
        if (statusEl) {
          statusEl.classList.add("is-error");
          statusEl.textContent = "Please provide an email address or phone number.";
        }
        return;
      }
      if (statusEl) {
        statusEl.classList.remove("is-error");
        statusEl.textContent = "";
      }

      generateAndShowProfileJourneyScreen({
        name,
        contact,
        programPath,
        careerCenterStatus
      });
      showToast(`Profile created! Generated ${resolveProgramPathKey(programPath)} roadmap.`);
    });
  }

  if (candidateOpenJourneyBtn) {
    candidateOpenJourneyBtn.addEventListener("click", () => {
      const name = candidateConfirmationScreen?.querySelector(".confirm-name")?.textContent || "Springboards Trainee";
      const trade = candidateConfirmationScreen?.querySelector(".confirm-trade")?.textContent || "Carpentry & Construction Technology";
      if (candidateModal) closeModalWithFocus(candidateModal);
      generateAndShowProfileJourneyScreen({
        name,
        contact: "",
        programPath: trade,
        careerCenterStatus: "Need Guided Career Center Verification"
      });
    });
  }

  if (inquiryOpenJourneyBtn) {
    inquiryOpenJourneyBtn.addEventListener("click", () => {
      const name = inquiryConfirmationScreen?.querySelector(".confirm-name")?.textContent || "Springboards Trainee";
      const program = inquiryConfirmationScreen?.querySelector(".confirm-program")?.textContent || "Learn";
      if (inquiryModal) closeModalWithFocus(inquiryModal);
      generateAndShowProfileJourneyScreen({
        name,
        contact: "",
        programPath: program,
        careerCenterStatus: "Need Guided Career Center Verification"
      });
    });
  }

  // =========================================================================
  // GOOGLE CLASSROOM LIVE LEARNING INTEGRATION HUB (HOMEPAGE)
  // =========================================================================
  const classroomSignInBtn = document.getElementById("classroomSignInBtn");
  const classroomConnectedActions = document.getElementById("classroomConnectedActions");
  const classroomAuthBadge = document.getElementById("classroomAuthBadge");
  const classroomCoursesMount = document.getElementById("classroomCoursesMount");
  const classroomCoursesList = document.getElementById("classroomCoursesList");
  const classroomCourseDetail = document.getElementById("classroomCourseDetail");
  const classroomRefreshBtn = document.getElementById("classroomRefreshBtn");
  const classroomCreateCourseBtn = document.getElementById("classroomCreateCourseBtn");
  const classroomSignOutBtn = document.getElementById("classroomSignOutBtn");

  const escapeHtmlSafe = (str) =>
    String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));

  const loadAndRenderClassroomCourses = async () => {
    if (!classroomCoursesMount || !classroomCoursesList) return;
    classroomCoursesMount.hidden = false;
    classroomCoursesList.innerHTML = `<div class="classroom-course-card"><p>Loading your Google Classroom courses...</p></div>`;

    try {
      const courses = await window.SpringboardsWorkspace.listClassroomCourses();
      if (!courses || courses.length === 0) {
        classroomCoursesList.innerHTML = `
          <div class="classroom-course-card">
            <div>
              <h5>No Active Google Classroom Courses Found</h5>
              <p>Click <strong>+ Create Trade Cohort Course</strong> above to provision a Springboards NCCER &amp; OSHA-10 course in your Google Classroom account.</p>
            </div>
          </div>
        `;
        return;
      }

      classroomCoursesList.innerHTML = courses
        .map(
          (course) => `
          <div class="classroom-course-card">
            <div>
              <h5>${escapeHtmlSafe(course.name || "Untitled Course")}</h5>
              <p>${escapeHtmlSafe(course.section || "Springboards Trade Pathway")} • <span style="font-weight:700;color:#15803d;">${escapeHtmlSafe(course.courseState || "ACTIVE")}</span></p>
              ${course.enrollmentCode ? `<p style="margin-top:0.25rem;font-size:0.78rem;">Enrollment Code: <code>${escapeHtmlSafe(course.enrollmentCode)}</code></p>` : ""}
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button type="button" class="journey-util-btn" data-inspect-course="${escapeHtmlSafe(course.id)}" data-course-name="${escapeHtmlSafe(course.name)}">View Coursework &amp; Stream</button>
              ${course.alternateLink ? `<a href="${escapeHtmlSafe(course.alternateLink)}" target="_blank" rel="noopener noreferrer" class="journey-util-btn" style="text-align:center;text-decoration:none;">Open in Classroom ↗</a>` : ""}
            </div>
          </div>
        `
        )
        .join("");

      classroomCoursesList.querySelectorAll("[data-inspect-course]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const courseId = btn.getAttribute("data-inspect-course");
          const courseName = btn.getAttribute("data-course-name");
          if (!courseId || !classroomCourseDetail) return;
          classroomCourseDetail.hidden = false;
          classroomCourseDetail.innerHTML = `<p style="margin:0;font-size:0.9rem;">Loading coursework, announcements, and roster for <strong>${escapeHtmlSafe(courseName)}</strong>...</p>`;
          try {
            const details = await window.SpringboardsWorkspace.getClassroomCourseDetails(courseId);
            const cwList = details.courseWork || [];
            const annList = details.announcements || [];
            const studentList = details.students || [];

            classroomCourseDetail.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
                <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">${escapeHtmlSafe(courseName)} — Coursework &amp; Stream</h5>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                  <button type="button" class="journey-util-btn" id="btnAddClassroomAssignment">+ Add Assignment</button>
                  <button type="button" class="journey-util-btn" id="btnPostClassroomAnnouncement">+ Post Announcement</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;font-size:0.85rem;">
                <div>
                  <strong style="color:var(--primary-navy);">Assignments (${cwList.length})</strong>
                  <ul style="margin:0.4rem 0 0;padding-left:1.1rem;">
                    ${cwList.length ? cwList.map((cw) => `<li><strong>${escapeHtmlSafe(cw.title)}</strong> (${cw.maxPoints || 100} pts)</li>`).join("") : "<li>No assignments posted yet.</li>"}
                  </ul>
                </div>
                <div>
                  <strong style="color:var(--primary-navy);">Stream Announcements (${annList.length})</strong>
                  <ul style="margin:0.4rem 0 0;padding-left:1.1rem;">
                    ${annList.length ? annList.map((a) => `<li>${escapeHtmlSafe((a.text || "").slice(0, 90))}</li>`).join("") : "<li>No announcements yet.</li>"}
                  </ul>
                </div>
                <div>
                  <strong style="color:var(--primary-navy);">Enrolled Trainees (${studentList.length})</strong>
                  <p style="margin:0.4rem 0 0;color:var(--text-muted);">${studentList.length ? `${studentList.length} student(s) active in roster.` : "Ready for trainee enrollment."}</p>
                </div>
              </div>
            `;

            const addAssignBtn = document.getElementById("btnAddClassroomAssignment");
            if (addAssignBtn) {
              addAssignBtn.addEventListener("click", async () => {
                try {
                  const created = await window.SpringboardsWorkspace.createClassroomAssignment(courseId, {
                    title: "OSHA-10 Jobsite Hazard Identification & PPE Lab Check",
                    description: "Complete the safety inspection checklist at your Springboards shop station and submit your verification notes.",
                    maxPoints: 100
                  });
                  if (created) {
                    showToast("Assignment published to Google Classroom!");
                    btn.click();
                  }
                } catch (err) {
                  showToast(err.message || "Could not create assignment.");
                }
              });
            }

            const postAnnBtn = document.getElementById("btnPostClassroomAnnouncement");
            if (postAnnBtn) {
              postAnnBtn.addEventListener("click", async () => {
                try {
                  const posted = await window.SpringboardsWorkspace.postClassroomAnnouncement(
                    courseId,
                    "Welcome to Springboards Trade Training! Shop hours run Monday–Thursday, 8:00 AM – 4:00 PM at 2269 15th Ave. S.W., Lanett, AL."
                  );
                  if (posted) {
                    showToast("Announcement posted to Google Classroom!");
                    btn.click();
                  }
                } catch (err) {
                  showToast(err.message || "Could not post announcement.");
                }
              });
            }
          } catch (err) {
            classroomCourseDetail.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.88rem;">Could not load course details: ${escapeHtmlSafe(err.message)}</p>`;
          }
        });
      });
    } catch (err) {
      classroomCoursesList.innerHTML = `
        <div class="classroom-course-card">
          <p style="color:#b91c1c;">${escapeHtmlSafe(err.message || "Could not load Google Classroom courses.")}</p>
        </div>
      `;
    }
  };

  const workspaceSuiteTabs = document.getElementById("workspaceSuiteTabs");
  const workspaceSuiteToolPanel = document.getElementById("workspaceSuiteToolPanel");

  // Local Shop Safety Notes fallback so trainees/instructors can always manage Keep checklists even without Enterprise Domain-Wide Delegation
  const defaultKeepNotes = [
    {
      id: "keep-local-1",
      title: "OSHA-10 Daily Shop Station Safety Checklist",
      items: [
        { text: "Inspect ANSI Z87.1 safety glasses, hearing protection, and work boots", checked: true },
        { text: "Verify GFCI outlets and power cord grounding before operating saws", checked: true },
        { text: "Confirm dust collection and ventilation active in Carpentry Bay", checked: false },
        { text: "Log tool checkout in Lanett Shop inventory sheet", checked: false }
      ]
    },
    {
      id: "keep-local-2",
      title: "Electrical & Plumbing Lab Prep Notes",
      items: [
        { text: "Lockout/Tagout (LOTO) verification on breaker trainer panels", checked: true },
        { text: "Check PEX crimping gauges and copper soldering torches", checked: false }
      ]
    }
  ];

  const renderKeepTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;font-size:0.9rem;">Checking Google Keep API (<code>keep.googleapis.com</code>) &amp; Shop Safety Notes...</p>`;

    let remoteNotes = [];
    let enterpriseNotice = "";
    try {
      if (window.SpringboardsWorkspace?.getCurrentAccessToken?.()) {
        const res = await window.SpringboardsWorkspace.listKeepNotes();
        remoteNotes = res?.notes || [];
      } else {
        enterpriseNotice = "Sign in with Google above to test live Google Keep API calls, or manage local shop checklists below.";
      }
    } catch (err) {
      enterpriseNotice = err.message || "Google Keep API (keep.googleapis.com) is an enterprise-only API requiring Google Workspace domain-wide delegation.";
    }

    const renderLocalChecklistCards = () =>
      defaultKeepNotes
        .map(
          (note, idx) => `
          <div class="classroom-course-card" style="background:#fefce8;border-color:#fde047;">
            <div>
              <h5 style="margin:0 0 0.35rem;color:#713f12;">📌 ${escapeHtmlSafe(note.title)}</h5>
              <ul style="list-style:none;padding:0;margin:0;font-size:0.84rem;">
                ${note.items
                  .map(
                    (it, iIdx) => `
                    <li style="margin:0.25rem 0;">
                      <label style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;">
                        <input type="checkbox" data-keep-note="${idx}" data-keep-item="${iIdx}" ${it.checked ? "checked" : ""} />
                        <span style="${it.checked ? "text-decoration:line-through;color:#854d0e;" : "color:#422006;"}">${escapeHtmlSafe(it.text)}</span>
                      </label>
                    </li>`
                  )
                  .join("")}
              </ul>
            </div>
          </div>`
        )
        .join("");

    workspaceSuiteToolPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
        <div>
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Keep — Shop Safety Notes &amp; Tool Checklists</h5>
          <p style="margin:0.2rem 0 0;font-size:0.82rem;color:var(--text-muted);">
            Note: Google Keep API (<code>https://www.googleapis.com/auth/keep</code>) is an Enterprise-only Google Workspace API requiring Admin Console domain-wide delegation.
          </p>
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button type="button" class="journey-util-btn" id="btnCreateKeepApiNote">+ Create Safety Checklist in Keep API</button>
          <button type="button" class="journey-util-btn" id="btnAddLocalKeepNote">+ Add Shop Note</button>
        </div>
      </div>
      ${
        enterpriseNotice
          ? `<div style="padding:0.6rem 0.85rem;margin-bottom:0.75rem;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:0.82rem;color:#92400e;">
               <strong>Google Keep Enterprise API Status:</strong> ${escapeHtmlSafe(enterpriseNotice)}
             </div>`
          : ""
      }
      <div class="classroom-courses-grid" id="keepNotesGrid">
        ${
          remoteNotes.length
            ? remoteNotes
                .map(
                  (n) => `
              <div class="classroom-course-card" style="background:#fefce8;">
                <h5>${escapeHtmlSafe(n.title || n.name)}</h5>
                <p style="font-size:0.83rem;">Synced from Google Keep API</p>
              </div>`
                )
                .join("")
            : ""
        }
        ${renderLocalChecklistCards()}
      </div>
    `;

    workspaceSuiteToolPanel.querySelectorAll("[data-keep-note]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const nIdx = Number(cb.getAttribute("data-keep-note"));
        const iIdx = Number(cb.getAttribute("data-keep-item"));
        if (defaultKeepNotes[nIdx]?.items?.[iIdx]) {
          defaultKeepNotes[nIdx].items[iIdx].checked = cb.checked;
          renderKeepTab();
        }
      });
    });

    const btnCreateKeepApiNote = document.getElementById("btnCreateKeepApiNote");
    if (btnCreateKeepApiNote) {
      btnCreateKeepApiNote.addEventListener("click", async () => {
        try {
          const created = await window.SpringboardsWorkspace.createKeepSafetyNote({
            title: "Springboards Shop Safety & PPE Checklist",
            checklistItems: [
              "Verify ANSI Z87.1 Eye Protection & Ear Protection",
              "Inspect Power Tool Cord & Grounding",
              "Complete Station Clean-Up Before 4:00 PM Dismissal"
            ]
          });
          if (created) {
            showToast("Created checklist note in Google Keep!");
            renderKeepTab();
          }
        } catch (err) {
          showToast(err.message || "Google Keep API requires Google Workspace Enterprise domain-wide delegation.");
        }
      });
    }

    const btnAddLocalKeepNote = document.getElementById("btnAddLocalKeepNote");
    if (btnAddLocalKeepNote) {
      btnAddLocalKeepNote.addEventListener("click", () => {
        defaultKeepNotes.unshift({
          id: `keep-local-${Date.now()}`,
          title: `Cohort Shop Checklist (${new Date().toLocaleDateString()})`,
          items: [
            { text: "Verify PPE & station readiness before lab", checked: false },
            { text: "Record NCCER module progress with instructor", checked: false }
          ]
        });
        showToast("Added new Shop Safety Checklist note.");
        renderKeepTab();
      });
    }
  };

  const renderDocsTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;font-size:0.9rem;">Loading Google Docs training manuals &amp; syllabi...</p>`;
    try {
      const files = await window.SpringboardsWorkspace.listGoogleDocs();
      workspaceSuiteToolPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Docs — Training Manuals &amp; Syllabi (${files.length})</h5>
          <button type="button" class="journey-util-btn" id="btnCreateTrainingDoc">+ Create Training Syllabus Doc</button>
        </div>
        <div class="classroom-courses-grid">
          ${
            files.length
              ? files
                  .map(
                    (f) => `
                <div class="classroom-course-card">
                  <div>
                    <h5>${escapeHtmlSafe(f.name)}</h5>
                    <p style="font-size:0.8rem;color:var(--text-muted);">Updated: ${escapeHtmlSafe(f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "Recent")}</p>
                  </div>
                  ${f.webViewLink ? `<a href="${escapeHtmlSafe(f.webViewLink)}" target="_blank" rel="noopener noreferrer" class="journey-util-btn" style="text-decoration:none;">Open in Docs ↗</a>` : ""}
                </div>`
                  )
                  .join("")
              : `<div class="classroom-course-card"><p>No Google Docs found yet. Click <strong>+ Create Training Syllabus Doc</strong> to generate one.</p></div>`
          }
        </div>
      `;
      document.getElementById("btnCreateTrainingDoc")?.addEventListener("click", async () => {
        try {
          const doc = await window.SpringboardsWorkspace.createTrainingManualDoc(
            "Springboards NCCER Core & Trade Training Manual",
            "Springboards for Community Development — 195-Hour Curriculum\nLocation: 2269 15th Ave. S.W., Lanett, AL\nSchedule: Mon–Thu, 8:00 AM – 4:00 PM\nModules: OSHA-10, Blueprint Reading, Electrical, Plumbing, Carpentry, HVAC, Welding."
          );
          if (doc) {
            showToast(`Created Google Doc: ${doc.title}`);
            renderDocsTab();
          }
        } catch (err) {
          showToast(err.message || "Could not create Google Doc.");
        }
      });
    } catch (err) {
      workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.88rem;">Sign in with Google above to access Google Docs (${escapeHtmlSafe(err.message)}).</p>`;
    }
  };

  const renderTasksTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;font-size:0.9rem;">Loading Google Tasks trainee onboarding checklist...</p>`;
    try {
      const { tasks } = await window.SpringboardsWorkspace.listGoogleTasks();
      workspaceSuiteToolPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Tasks — Trainee Onboarding &amp; Milestones (${tasks.length})</h5>
          <button type="button" class="journey-util-btn" id="btnCreateOnboardingTask">+ Add Trainee Onboarding Task</button>
        </div>
        <div class="classroom-courses-grid">
          ${
            tasks.length
              ? tasks
                  .map(
                    (t) => `
                <div class="classroom-course-card">
                  <h5>${escapeHtmlSafe(t.title || "Untitled Task")}</h5>
                  <p style="font-size:0.82rem;color:var(--text-muted);">${escapeHtmlSafe(t.notes || "Springboards trainee milestone")}</p>
                </div>`
                  )
                  .join("")
              : `<div class="classroom-course-card"><p>No onboarding tasks found. Click <strong>+ Add Trainee Onboarding Task</strong> to create one.</p></div>`
          }
        </div>
      `;
      document.getElementById("btnCreateOnboardingTask")?.addEventListener("click", async () => {
        try {
          const created = await window.SpringboardsWorkspace.createTraineeOnboardingTask({
            title: "Complete OSHA-10 Module & Bring Photo ID to Lanett Campus",
            notes: "Required prior to Week 1 hands-on shop rotation at 2269 15th Ave. S.W., Lanett, AL."
          });
          if (created) {
            showToast("Added onboarding task to Google Tasks!");
            renderTasksTab();
          }
        } catch (err) {
          showToast(err.message || "Could not create task.");
        }
      });
    } catch (err) {
      workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.88rem;">Sign in with Google above to access Google Tasks (${escapeHtmlSafe(err.message)}).</p>`;
    }
  };

  const renderSlidesTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;font-size:0.9rem;">Loading Google Slides orientation presentations...</p>`;
    try {
      const decks = await window.SpringboardsWorkspace.listGoogleSlides();
      workspaceSuiteToolPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Slides — Safety &amp; Trade Orientation Decks (${decks.length})</h5>
          <button type="button" class="journey-util-btn" id="btnCreateSlideDeck">+ Create Orientation Slide Deck</button>
        </div>
        <div class="classroom-courses-grid">
          ${
            decks.length
              ? decks
                  .map(
                    (d) => `
                <div class="classroom-course-card">
                  <h5>${escapeHtmlSafe(d.name)}</h5>
                  ${d.webViewLink ? `<a href="${escapeHtmlSafe(d.webViewLink)}" target="_blank" rel="noopener noreferrer" class="journey-util-btn" style="text-decoration:none;">Open in Slides ↗</a>` : ""}
                </div>`
                  )
                  .join("")
              : `<div class="classroom-course-card"><p>No Slides decks found. Click <strong>+ Create Orientation Slide Deck</strong> to generate one.</p></div>`
          }
        </div>
      `;
      document.getElementById("btnCreateSlideDeck")?.addEventListener("click", async () => {
        try {
          const deck = await window.SpringboardsWorkspace.createSafetyOrientationDeck(
            "Springboards OSHA-10 & Skilled Trades Orientation Deck"
          );
          if (deck) {
            showToast(`Created Google Slides presentation: ${deck.title}`);
            renderSlidesTab();
          }
        } catch (err) {
          showToast(err.message || "Could not create presentation.");
        }
      });
    } catch (err) {
      workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.88rem;">Sign in with Google above to access Google Slides (${escapeHtmlSafe(err.message)}).</p>`;
    }
  };

  const renderContactsTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;font-size:0.9rem;">Loading Google Contacts mentor &amp; employer directory...</p>`;
    try {
      const contacts = await window.SpringboardsWorkspace.listGoogleContacts();
      workspaceSuiteToolPanel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Contacts — Employer Partners &amp; Mentors (${contacts.length})</h5>
          <button type="button" class="journey-util-btn" id="btnCreatePartnerContact">+ Save Springboards Admissions Contact</button>
        </div>
        <div class="classroom-courses-grid">
          ${
            contacts.length
              ? contacts
                  .slice(0, 8)
                  .map((c) => {
                    const name = c.names?.[0]?.displayName || "Contact";
                    const email = c.emailAddresses?.[0]?.value || "";
                    const phone = c.phoneNumbers?.[0]?.value || "";
                    return `
                      <div class="classroom-course-card">
                        <h5>${escapeHtmlSafe(name)}</h5>
                        <p style="font-size:0.82rem;color:var(--text-muted);">${escapeHtmlSafe(email)} ${phone ? `• ${escapeHtmlSafe(phone)}` : ""}</p>
                      </div>`;
                  })
                  .join("")
              : `<div class="classroom-course-card"><p>No contacts listed yet. Click <strong>+ Save Springboards Admissions Contact</strong> to add Springboards to your Google Contacts.</p></div>`
          }
        </div>
      `;
      document.getElementById("btnCreatePartnerContact")?.addEventListener("click", async () => {
        try {
          const created = await window.SpringboardsWorkspace.createSpringboardsContact({
            givenName: "Springboards",
            familyName: "Admissions & Trade Center",
            email: "info@springboardsfcd.org",
            phone: "(706) 590-3779",
            role: "Workforce Training Admissions"
          });
          if (created) {
            showToast("Saved Springboards Admissions to your Google Contacts!");
            renderContactsTab();
          }
        } catch (err) {
          showToast(err.message || "Could not save contact.");
        }
      });
    } catch (err) {
      workspaceSuiteToolPanel.innerHTML = `<p style="margin:0;color:#b91c1c;font-size:0.88rem;">Sign in with Google above to access Google Contacts (${escapeHtmlSafe(err.message)}).</p>`;
    }
  };

  const renderChatMeetTab = async () => {
    if (!workspaceSuiteToolPanel) return;
    workspaceSuiteToolPanel.hidden = false;
    workspaceSuiteToolPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
        <div>
          <h5 style="margin:0;font-size:1.05rem;color:var(--primary-navy);">Google Meet &amp; Google Chat — Live Cohort Collaboration</h5>
          <p style="margin:0.2rem 0 0;font-size:0.82rem;color:var(--text-muted);">Create instant Google Meet video intake rooms or connect to Google Chat spaces.</p>
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button type="button" class="journey-util-btn" id="btnCreateMeetSpace">+ Create Google Meet Intake Room</button>
          <button type="button" class="journey-util-btn" id="btnLoadChatSpaces">↻ Load Google Chat Spaces</button>
        </div>
      </div>
      <div id="chatMeetOutputArea" class="classroom-courses-grid">
        <div class="classroom-course-card">
          <h5>Google Meet Video Advising</h5>
          <p style="font-size:0.83rem;">Generate a live <code>meet.googleapis.com/v2/spaces</code> video room for trainee admissions interviews or remote blueprint review.</p>
        </div>
      </div>
    `;

    const outputArea = document.getElementById("chatMeetOutputArea");

    document.getElementById("btnCreateMeetSpace")?.addEventListener("click", async () => {
      try {
        const space = await window.SpringboardsWorkspace.createMeetIntakeSpace();
        if (space && outputArea) {
          outputArea.innerHTML = `
            <div class="classroom-course-card">
              <h5>Google Meet Room Active</h5>
              <p style="font-size:0.84rem;">Meeting Code: <code>${escapeHtmlSafe(space.meetingCode || space.name)}</code></p>
              ${space.meetingUri ? `<a href="${escapeHtmlSafe(space.meetingUri)}" target="_blank" rel="noopener noreferrer" class="journey-util-btn" style="text-decoration:none;">Join Google Meet ↗</a>` : ""}
            </div>
          `;
          showToast("Created Google Meet advising room!");
        }
      } catch (err) {
        showToast(err.message || "Could not create Google Meet space.");
      }
    });

    document.getElementById("btnLoadChatSpaces")?.addEventListener("click", async () => {
      if (!outputArea) return;
      outputArea.innerHTML = `<div class="classroom-course-card"><p>Loading Google Chat spaces...</p></div>`;
      try {
        const spaces = await window.SpringboardsWorkspace.listChatSpaces();
        outputArea.innerHTML = spaces.length
          ? spaces
              .map(
                (s) => `
              <div class="classroom-course-card">
                <h5>${escapeHtmlSafe(s.displayName || s.name)}</h5>
                <p style="font-size:0.8rem;">Space Type: ${escapeHtmlSafe(s.spaceType || "SPACE")}</p>
              </div>`
              )
              .join("")
          : `<div class="classroom-course-card"><p>No Google Chat spaces found for this account.</p></div>`;
      } catch (err) {
        outputArea.innerHTML = `
          <div class="classroom-course-card">
            <p style="color:#b91c1c;font-size:0.84rem;">${escapeHtmlSafe(err.message)}</p>
          </div>`;
      }
    });
  };

  if (workspaceSuiteTabs) {
    workspaceSuiteTabs.querySelectorAll("[data-ws-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-ws-tab");
        workspaceSuiteTabs.querySelectorAll("[data-ws-tab]").forEach((b) => {
          b.style.fontWeight = b === btn ? "700" : "500";
        });

        if (tab === "classroom") {
          if (workspaceSuiteToolPanel) workspaceSuiteToolPanel.hidden = true;
          loadAndRenderClassroomCourses();
        } else if (tab === "keep") {
          renderKeepTab();
        } else if (tab === "docs") {
          renderDocsTab();
        } else if (tab === "tasks") {
          renderTasksTab();
        } else if (tab === "slides") {
          renderSlidesTab();
        } else if (tab === "contacts") {
          renderContactsTab();
        } else if (tab === "chatmeet") {
          renderChatMeetTab();
        }
      });
    });
  }

  const syncClassroomUI = (isSignedIn, user) => {
    if (classroomSignInBtn) classroomSignInBtn.hidden = isSignedIn;
    if (classroomConnectedActions) classroomConnectedActions.hidden = !isSignedIn;
    if (classroomAuthBadge) {
      classroomAuthBadge.textContent = isSignedIn
        ? `Connected: ${user?.email || "Google Workspace Active"}`
        : "Sign in to sync coursework & tools";
    }
    if (!isSignedIn && classroomCoursesMount) {
      classroomCoursesMount.hidden = true;
    }
  };

  if (classroomSignInBtn) {
    classroomSignInBtn.addEventListener("click", async () => {
      if (!window.SpringboardsWorkspace?.signInWithGoogle) {
        showToast("Initializing Google Workspace module...");
        return;
      }
      try {
        const res = await window.SpringboardsWorkspace.signInWithGoogle();
        syncClassroomUI(true, res.user);
        showToast(`Signed in to Google Workspace as ${res.user?.email || "User"}`);
        await loadAndRenderClassroomCourses();
      } catch (err) {
        showToast("Google Sign-In was cancelled or could not complete.");
      }
    });
  }

  if (classroomRefreshBtn) {
    classroomRefreshBtn.addEventListener("click", () => {
      loadAndRenderClassroomCourses();
    });
  }

  if (classroomCreateCourseBtn) {
    classroomCreateCourseBtn.addEventListener("click", async () => {
      try {
        const course = await window.SpringboardsWorkspace.createSpringboardsClassroomCourse();
        if (course) {
          showToast(`Created Google Classroom course: ${course.name}`);
          await loadAndRenderClassroomCourses();
        }
      } catch (err) {
        showToast(err.message || "Could not create course.");
      }
    });
  }

  if (classroomSignOutBtn) {
    classroomSignOutBtn.addEventListener("click", async () => {
      if (window.SpringboardsWorkspace?.signOutFromGoogle) {
        await window.SpringboardsWorkspace.signOutFromGoogle();
      }
      syncClassroomUI(false, null);
      if (workspaceSuiteToolPanel) workspaceSuiteToolPanel.hidden = true;
      showToast("Signed out of Google Workspace.");
    });
  }
});

