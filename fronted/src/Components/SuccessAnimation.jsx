import { useState } from "react";
import { motion } from "framer-motion";
import { AiOutlineLoading3Quarters, AiOutlineCheck } from "react-icons/ai";

const SuccessAnimation = ({ text = "נוצר בהצלחה" }) => {
    const [status, setStatus] = useState("loading"); // "loading" | "success"

    // סימולציה של יצירה (ניתן להפעיל עם API אמיתי)
    setTimeout(() => setStatus("success"), 2000);

    return (
        <motion.div
            className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                {status === "loading" ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                        <AiOutlineLoading3Quarters className="text-blue-500 text-6xl" />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="flex flex-col items-center"
                    >
                        <AiOutlineCheck className="text-green-500 text-7xl" />
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-xl text-gray-700 mt-3 font-semibold"
                        >
                            {text}
                        </motion.p>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default SuccessAnimation;
