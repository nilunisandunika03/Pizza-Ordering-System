import './TermsOfService.css';

const TermsOfService = () => {
    return (
        <div className="terms-page">
            <div className="container">
                <div className="terms-header">
                    <h1>Terms and Conditions</h1>
                </div>

                <div className="terms-card">
                    <section>
                        <h2>1. Introduction</h2>
                        <p>These Terms and Conditions apply to the use of the PizzaSlice website and services. By using this platform, you agree to comply with these terms. If you do not agree with these Terms, you should immediately stop using the service.</p>
                    </section>

                    <section>
                        <h2>2. Contact Details</h2>
                        <p>You can contact the PizzaSlice support team through the in-app support system for any inquiries regarding your orders or the service.</p>
                    </section>

                    <section>
                        <h2>3. Refund Policy</h2>
                        <p>Refunds will only be granted for payments on orders that cannot be fulfilled due to delivery limitations or system errors. Refunds, if applicable, will be processed within 14 working days.</p>
                    </section>

                    <section>
                        <h2>4. Transaction Currency</h2>
                        <p>All prices on PizzaSlice are listed in your local currency. Charges will be processed according to the prevailing exchange rate if applicable.</p>
                    </section>

                    <section>
                        <h2>5. Transaction Security</h2>
                        <p>Payments are processed through secure payment gateways. All payment information is transmitted securely using industry-standard encryption technologies.</p>
                    </section>

                    <section>
                        <h2>6. Customer Information</h2>
                        <p>PizzaSlice may collect personally identifiable information you voluntarily provide, such as:</p>
                        <ul>
                            <li>Name, contact details, and delivery address</li>
                            <li>Email address for notifications</li>
                            <li>Account login and preferences</li>
                        </ul>
                        <p>You have the choice whether or not to provide this information; however, some features may not function properly if you choose not to disclose necessary information.</p>
                        <p>Additionally, our system may automatically record your IP address and device information to improve security and service reliability.</p>
                    </section>

                    <section>
                        <h2>7. Discount Policy</h2>
                        <p>Promotions, discounts, or meal deals may not be combined unless explicitly stated. PizzaSlice reserves the right to modify or cancel discounts at any time.</p>
                    </section>

                    <section>
                        <h2>8. User Responsibilities</h2>
                        <ul>
                            <li>You must be of legal age to place orders.</li>
                            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                            <li>You must use the platform only for lawful purposes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2>9. Intellectual Property</h2>
                        <p>All content on PizzaSlice, including logos, images, menus, and text, is the property of PizzaSlice. Users may not reproduce or distribute content without prior permission.</p>
                    </section>

                    <section>
                        <h2>10. Limitation of Liability</h2>
                        <p>PizzaSlice is provided “as-is” and does not guarantee uninterrupted service. We are not liable for any loss or inconvenience arising from the use of the platform.</p>
                    </section>

                    <section>
                        <h2>11. Changes to Terms</h2>
                        <p>PizzaSlice may update these Terms of Service from time to time. Continued use of the platform constitutes acceptance of the updated terms.</p>
                    </section>

                    <section>
                        <h2>12. Governing Law</h2>
                        <p>These Terms are governed by the laws applicable in your country of residence.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
