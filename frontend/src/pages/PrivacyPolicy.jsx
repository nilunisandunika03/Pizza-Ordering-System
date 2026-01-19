import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    return (
        <div className="privacy-page">
            <div className="container">
                <div className="privacy-header">
                    <h1>Privacy Policy</h1>
                                    </div>

                <div className="privacy-card">
                    <section>
                        <h2>1. Introduction</h2>
                        <p>Welcome to PizzaSlice. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our pizza ordering system.</p>
                    </section>

                    <section>
                        <h2>2. Information We Collect</h2>
                        <p>We collect information to provide better services, including:</p>
                        <ul>
                            <li>Personal details such as your name, email, and phone number.</li>
                            <li>Delivery information, including your address, to ensure accurate order fulfillment.</li>
                            <li>Account information to manage your login and preferences securely.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>3. How We Use Your Information</h2>
                        <p>Your data is used for:</p>
                        <ul>
                            <li>Processing and fulfilling your pizza orders.</li>
                            <li>Sending order confirmations and delivery updates.</li>
                            <li>Improving our menu, services, and user experience.</li>
                            <li>Ensuring account security and preventing unauthorized access.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. Data Security</h2>
                        <p>We take appropriate measures to protect your information from unauthorized access, disclosure, or alteration. Your personal data and account information are stored securely following industry best practices.</p>
                    </section>

                    <section>
                        <h2>5. Your Rights</h2>
                        <p>You have the right to access, correct, or request deletion of your personal information. You can contact us through the system if you wish to exercise these rights.</p>
                    </section>

                    <section>
                        <h2>6. Contact Us</h2>
                        <p>For any questions or concerns regarding this Privacy Policy, you can reach out through the PizzaSlice platform’s support or contact system.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
