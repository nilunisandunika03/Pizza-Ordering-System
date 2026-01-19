const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587/25
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"Pizza Ordering System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        };

        
        console.log('--- EMAIL SENT (LOG) ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${html}`);
        console.log('------------------------');

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
    }
};


const sendOrderConfirmation = async (to, order) => {
    const itemsList = order.items.map(item =>
        `<li>${item.quantity}x ${item.product_snapshot.name} - Rs. ${item.total_price.toFixed(2)}</li>`
    ).join('');

    const html = `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_time).toLocaleString()}</p>
        
        <h3>Order Details:</h3>
        <ul>${itemsList}</ul>
        
        <p><strong>Subtotal:</strong> Rs. ${order.subtotal.toFixed(2)}</p>
        <p><strong>Delivery Fee:</strong> Rs. ${order.delivery_fee.toFixed(2)}</p>
        <p><strong>Total:</strong> Rs. ${order.total.toFixed(2)}</p>
        
        <h3>Delivery Address:</h3>
        <p>
            ${order.delivery_address.street}<br>
            ${order.delivery_address.city}, ${order.delivery_address.state} ${order.delivery_address.zip_code}
        </p>
        
        <p>You can track your order status in your account.</p>
    `;

    await sendEmail(to, `Order Confirmation - ${order.order_number}`, html);
};

// Order status update email
const sendOrderStatusUpdate = async (to, order, statusMessage) => {
    const html = `
        <h2>Order Status Update</h2>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
        <p>${statusMessage}</p>
        
        ${order.status === 'out_for_delivery' ?
            `<p><strong>Estimated Delivery:</strong> ${new Date(order.estimated_delivery_time).toLocaleString()}</p>` :
            ''
        }
        
        <p>You can track your order in your account.</p>
    `;

    await sendEmail(to, `Order Update - ${order.order_number}`, html);
};

module.exports = {
    sendEmail,
    sendOrderConfirmation,
    sendOrderStatusUpdate
};
