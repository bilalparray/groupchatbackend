import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,       // apne .env file me rakho
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default razorpay;
