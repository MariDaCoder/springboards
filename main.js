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
    { id: "our-programs", link: document.querySelectorAll(".nav-dropdown-toggle")[0] },
    { id: "our-impact", link: document.querySelectorAll(".nav-dropdown-toggle")[1] },
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
      const program = inquiryForm.elements.program.value;
      const formData = new FormData(inquiryForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();

      status.classList.remove("is-error");
      inquiryForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

      // 1. Validate Name
      if (!name || name.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please enter your full name, minimum 2 characters.";
        inquiryForm.elements.name.classList.add("is-invalid");
        inquiryForm.elements.name.focus();
        return;
      }

      // 2. Validate at least one contact method
      if (!phone && !email) {
        status.classList.add("is-error");
        status.textContent = "Please provide either a phone number or email address.";
        inquiryForm.elements.phone.classList.add("is-invalid");
        inquiryForm.elements.email.classList.add("is-invalid");
        inquiryForm.elements.phone.focus();
        return;
      }

      // 3. Validate Phone format if provided
      if (phone && !isValidPhone(phone)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid 10-digit phone number (e.g. 555-123-4567).";
        inquiryForm.elements.phone.classList.add("is-invalid");
        inquiryForm.elements.phone.focus();
        return;
      }

      // 4. Validate Email format if provided
      if (email && !isValidEmail(email)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid email address, e.g. name@example.com.";
        inquiryForm.elements.email.classList.add("is-invalid");
        inquiryForm.elements.email.focus();
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
      const formData = new FormData(volunteerSignupForm);
      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const availability = String(formData.get("availability") || "flexible").trim();
      const interest = String(formData.get("interest") || "general").trim();
      const organization = String(formData.get("organization") || "").trim();

      status.classList.remove("is-error");
      volunteerSignupForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

      // 1. Validate Name
      if (!name || name.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please enter your full name, minimum 2 characters.";
        volunteerSignupForm.elements.name.classList.add("is-invalid");
        volunteerSignupForm.elements.name.focus();
        return;
      }

      // 2. Validate at least one contact method
      if (!phone && !email) {
        status.classList.add("is-error");
        status.textContent = "Please provide either a phone number or email address.";
        volunteerSignupForm.elements.phone.classList.add("is-invalid");
        volunteerSignupForm.elements.email.classList.add("is-invalid");
        volunteerSignupForm.elements.phone.focus();
        return;
      }

      // 3. Validate Phone format if provided
      if (phone && !isValidPhone(phone)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid 10-digit phone number (e.g. 555-123-4567).";
        volunteerSignupForm.elements.phone.classList.add("is-invalid");
        volunteerSignupForm.elements.phone.focus();
        return;
      }

      // 4. Validate Email format if provided
      if (email && !isValidEmail(email)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid email address, e.g. name@example.com.";
        volunteerSignupForm.elements.email.classList.add("is-invalid");
        volunteerSignupForm.elements.email.focus();
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

      status.classList.remove("is-error");
      candidateForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

      if (!name || name.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please enter your full legal name (minimum 2 characters).";
        candidateForm.elements.name.classList.add("is-invalid");
        candidateForm.elements.name.focus();
        return;
      }

      if (!phone && !email) {
        status.classList.add("is-error");
        status.textContent = "Please provide either a phone number or email address so we can reach you.";
        candidateForm.elements.phone.classList.add("is-invalid");
        candidateForm.elements.email.classList.add("is-invalid");
        candidateForm.elements.phone.focus();
        return;
      }

      if (phone && !isValidPhone(phone)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid 10-digit phone number, e.g. (334) 556-1234.";
        candidateForm.elements.phone.classList.add("is-invalid");
        candidateForm.elements.phone.focus();
        return;
      }

      if (email && !isValidEmail(email)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid email address (e.g. name@example.com).";
        candidateForm.elements.email.classList.add("is-invalid");
        candidateForm.elements.email.focus();
        return;
      }

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
            "https://firestore.googleapis.com/v1/projects/springboards-community-dev/databases/(default)/documents/candidateApplications",
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

      status.classList.remove("is-error");
      partnerForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

      if (!companyName || companyName.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please provide your company or organization name.";
        partnerForm.elements.companyName.classList.add("is-invalid");
        partnerForm.elements.companyName.focus();
        return;
      }

      if (!contactName || contactName.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please provide a contact person name.";
        partnerForm.elements.contactName.classList.add("is-invalid");
        partnerForm.elements.contactName.focus();
        return;
      }

      if (!phone && !email) {
        status.classList.add("is-error");
        status.textContent = "Please provide either a phone number or business email address.";
        partnerForm.elements.phone.classList.add("is-invalid");
        partnerForm.elements.email.classList.add("is-invalid");
        partnerForm.elements.phone.focus();
        return;
      }

      if (phone && !isValidPhone(phone)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid 10-digit phone number.";
        partnerForm.elements.phone.classList.add("is-invalid");
        partnerForm.elements.phone.focus();
        return;
      }

      if (email && !isValidEmail(email)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid business email address.";
        partnerForm.elements.email.classList.add("is-invalid");
        partnerForm.elements.email.focus();
        return;
      }

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

      status.classList.remove("is-error");
      donateForm.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

      if (!donorName || donorName.length < 2) {
        status.classList.add("is-error");
        status.textContent = "Please enter your full name or organization name.";
        donateForm.elements.donorName.classList.add("is-invalid");
        donateForm.elements.donorName.focus();
        return;
      }

      if (!email || !isValidEmail(email)) {
        status.classList.add("is-error");
        status.textContent = "Please provide a valid email address so we can issue your tax acknowledgment.";
        donateForm.elements.email.classList.add("is-invalid");
        donateForm.elements.email.focus();
        return;
      }

      if (phone && !isValidPhone(phone)) {
        status.classList.add("is-error");
        status.textContent = "Please enter a valid 10-digit phone number.";
        donateForm.elements.phone.classList.add("is-invalid");
        donateForm.elements.phone.focus();
        return;
      }

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
});
