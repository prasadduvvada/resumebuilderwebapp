// !!! IMPORTANT: REPLACE THESE WITH YOUR COGNITO USER POOL ID AND CLIENT ID !!!
// You will get these values in Step 3.
const POOL_ID = 'us-east-1_qNepl5dyc'; // Example: 'us-east-1_XXXXX'
const CLIENT_ID = '7brfva4f7i4qc4lo1s6ujb6qs3'; // Example: '1a2b3c4d5e6f7g8h9i0j'

// Configure the Cognito User Pool object
const poolData = {
    UserPoolId: POOL_ID,
    ClientId: CLIENT_ID
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

// --- User Registration Function ---
async function cognitoSignup(email, password) {
    return new Promise((resolve, reject) => {
        // Cognito signUp method
        userPool.signUp(email, password, [], null, (err, result) => {
            if (err) {
                reject(err); // Reject the promise if there's an error
            } else {
                resolve(result.user); // Resolve with the user object on success
            }
        });
    });
}

// --- User Login Function ---
async function cognitoLogin(email, password) {
    return new Promise((resolve, reject) => {
        const authenticationData = {
            Username: email,
            Password: password
        };
        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        const userData = {
            Username: email,
            Pool: userPool
        };
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        // Authenticate the user
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (session) => {
                // Store important tokens in localStorage after successful login
                localStorage.setItem('idToken', session.getIdToken().getJwtToken());
                localStorage.setItem('accessToken', session.getAccessToken().getJwtToken());
                localStorage.setItem('refreshToken', session.getRefreshToken().getToken());
                localStorage.setItem('userEmail', email); // Store email for pre-filling form
                resolve(session); // Resolve with the session object
            },
            onFailure: (err) => {
                reject(err); // Reject the promise on failure
            }
        });
    });
}

// --- User Logout Function ---
function cognitoLogout() {
    const email = localStorage.getItem('userEmail');
    if (email) {
        const userData = {
            Username: email,
            Pool: userPool
        };
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        cognitoUser.signOut(); // Sign out the Cognito user
    }
    localStorage.clear(); // Clear all stored tokens and user data
    window.location.href = 'login.html'; // Redirect to the login page after logout
}

// --- Check Login Status and Redirect ---
// This function is called by resume_form.html on load to ensure user is authenticated
function checkLoginStatus() {
    if (!localStorage.getItem('idToken')) {
        window.location.href = 'login.html'; // If no ID token, redirect to login
    }
}