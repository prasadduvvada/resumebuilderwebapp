document.addEventListener('DOMContentLoaded', () => {
    // Ensure checkLoginStatus exists and call it
    if (typeof checkLoginStatus === 'function') {
        checkLoginStatus();
    } else {
        console.error('checkLoginStatus function not found. Ensure cognito-auth.js is loaded.');
        // window.location.href = 'login.html'; // Optional redirect
    }

    const resumeForm = document.getElementById('resumeForm');
    const messageElement = document.getElementById('message');
    const emailField = document.getElementById('email');
    const logoutButton = document.getElementById('logoutButton');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userEmail = localStorage.getItem('userEmail');

    if (userEmail) {
        if (emailField) emailField.value = userEmail;
        if (welcomeMessage) {
            // FIX: Added backticks for template literal here (was `Welcome, ${...}`)
            welcomeMessage.textContent = `Welcome, ${userEmail.split('@')[0]}! Build Your Professional Resume`;
        }
    } else {
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/index.html') {
            window.location.href = 'login.html';
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', cognitoLogout);
    } else {
        console.warn('Logout button not found with ID "logoutButton".');
    }

    // Initialize counters
    let educationCounter = 0; // Start at 0 for array indexing
    let experienceCounter = 0;
    let projectsCounter = 0;

    function addSectionEntry(containerId, templateHtml, counterVariableReference) { // Changed counterVar to counterVariableReference to make it clearer
        const container = document.getElementById(containerId);
        if (!container) {
            // FIX: Added backticks for template literal here (was `Container with ID ${...}`)
            console.error(`Container with ID ${containerId} not found.`);
            return;
        }
        const newEntry = document.createElement('div');
        newEntry.classList.add(templateHtml.includes('edu-entry') ? 'edu-entry' : templateHtml.includes('exp-entry') ? 'exp-entry' : 'proj-entry');
        
        // FIX: Corrected how the counter is used in replace, it should be the value of the variable, not a string '[${counterVar}]'
        // Also ensure the regex for replacement matches the format you use in the template, e.g., 'name="education[0][school]"'
        newEntry.innerHTML = templateHtml.replace(/\[0\]/g, `[${counterVariableReference}]`); // Use backticks and actual variable value

        container.appendChild(newEntry);
        // Do NOT increment here. Increment is handled in the event listener below.
    }

    const educationTemplate = `
        <label>School/College:</label>
        <input type="text" name="education[0][school]" required>
        <label>Degree/Major:</label>
        <input type="text" name="education[0][degree]" required>
        <label>Graduation Year:</label>
        <input type="text" name="education[0][year]" placeholder="e.g., 2023" required>
    `;

    const experienceTemplate = `
        <label>Company:</label>
        <input type="text" name="experience[0][company]" required>
        <label>Role/Title:</label>
        <input type="text" name="experience[0][role]" required>
        <label>Duration (e.g., 2020 - 2023):</label>
        <input type="text" name="experience[0][duration]" required>
    `;

    const projectTemplate = `
        <label>Project Title:</label>
        <input type="text" name="projects[0][title]">
        <label>Description:</label>
        <textarea name="projects[0][description]" rows="3"></textarea>
    `;

    const addEducationBtn = document.getElementById('addEducation');
    if (addEducationBtn) {
        addEducationBtn.addEventListener('click', () => {
            addSectionEntry('educationFields', educationTemplate, educationCounter);
            educationCounter++; // Increment counter AFTER adding
        });
    } else {
        console.warn('Button with ID "addEducation" not found.');
    }

    const addExperienceBtn = document.getElementById('addExperience');
    if (addExperienceBtn) {
        addExperienceBtn.addEventListener('click', () => {
            addSectionEntry('experienceFields', experienceTemplate, experienceCounter);
            experienceCounter++; // Increment counter AFTER adding
        });
    } else {
        console.warn('Button with ID "addExperience" not found.');
    }

    const addProjectBtn = document.getElementById('addProject');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            addSectionEntry('projectsFields', projectTemplate, projectsCounter);
            projectsCounter++; // Increment counter AFTER adding
        });
    } else {
        console.warn('Button with ID "addProject" not found.');
    }

    if (resumeForm) {
        resumeForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (messageElement) {
                messageElement.style.display = 'none';
            }

            const formData = new FormData(resumeForm);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            function collectSectionData(sectionId, fieldNames) {
                const sectionData = [];
                // FIX: Corrected querySelectorAll syntax (was previously 'Document' and potentially missing backticks)
                document.querySelectorAll(`#${sectionId} > div`).forEach(entryDiv => {
                    const entry = {};
                    let isEmpty = true;
                    fieldNames.forEach(fieldName => {
                        // Ensure backticks for querySelector template literal
                        const input = entryDiv.querySelector(`[name$="[${fieldName}]"]`);
                        if (input && input.value.trim() !== '') {
                            entry[fieldName] = input.value.trim();
                            isEmpty = false;
                        }
                    });
                    if (!isEmpty) {
                        sectionData.push(entry);
                    }
                });
                return sectionData;
            }

            // Collect data for dynamic sections
            data.education = collectSectionData('educationFields', ['school', 'degree', 'year']);
            data.experience = collectSectionData('experienceFields', ['company', 'role', 'duration']);
            data.projects = collectSectionData('projectsFields', ['title', 'description']);

            console.log("Data to send:", data);

            // !!! IMPORTANT: REPLACE WITH YOUR ACTUAL API GATEWAY INVOKE URL !!!
            const API_GATEWAY_URL = 'https://87cdbi4vpg.execute-api.us-east-1.amazonaws.com/prod/generate-resume'; // Example: https://abcd123.execute-api.us-east-1.amazonaws.com/dev/create-resume

            // Get the ID Token from localStorage (set by cognito-auth.js after successful login)
            const idToken = localStorage.getItem('idToken');
            if (!idToken) {
                if (messageElement) {
                    messageElement.textContent = 'Not authenticated. Please log in.';
                    messageElement.style.color = 'red';
                    messageElement.classList.add('error');
                    messageElement.style.display = 'block';
                }
                return; // Stop if no ID token is found
            }

            try {
                // Send the form data to your API Gateway
                const response = await fetch(API_GATEWAY_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // FIX: Corrected template literal with backticks for Authorization header
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(data), // Send data as a JSON string
                });

                const result = await response.json();
                console.log("API Response:", result);

                if (response.ok) {
                    if (messageElement) {
                        messageElement.textContent = result.message || 'Resume generated successfully! ';
                        messageElement.style.color = 'green';
                        messageElement.classList.remove('error');

                        // --- DISPLAY DOWNLOAD LINK ---
                        if (result.downloadUrl) {
                            const downloadLink = document.createElement('a');
                            downloadLink.href = result.downloadUrl;
                            downloadLink.textContent = 'Download Resume Here';
                            downloadLink.target = '_blank';
                            messageElement.appendChild(downloadLink);
                        }
                        // --- END DISPLAY DOWNLOAD LINK ---

                        messageElement.style.display = 'block';
                    }
                    resumeForm.reset(); // Clear the form fields
                    // Reset dynamic fields (remove all but the first if any)
                    document.querySelectorAll('.edu-entry, .exp-entry, .proj-entry').forEach((el, index) => {
                        if (index > 0) el.remove();
                    });
                    educationCounter = 0; // Reset counters for new entries
                    experienceCounter = 0;
                    projectsCounter = 0;

                } else {
                    if (messageElement) {
                        messageElement.textContent = result.error || 'Failed to generate resume. Please try again.';
                        messageElement.style.color = 'red';
                        messageElement.classList.add('error');
                        messageElement.style.display = 'block';
                    }
                    console.error("API Error:", result);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                if (messageElement) {
                    messageElement.textContent = 'An unexpected network error occurred. Please try again later.';
                    messageElement.style.color = 'red';
                    messageElement.classList.add('error');
                    messageElement.style.display = 'block';
                }
            }
        });
    } else {
        console.error('Resume form not found with ID "resumeForm".');
    }
});