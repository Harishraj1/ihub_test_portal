import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Users, Clock, ChevronRight, FileText, Code } from "lucide-react";
import { Card, CardHeader, CardFooter, CardBody } from "@nextui-org/react";

const TestCard = ({ title, type, date, category, stats, status, contestId }) => {
  const navigate = useNavigate();

  const handleViewTest = () => {
    navigate(`/viewtest/${contestId}`);
  };

  const statusStyles = {
    Live: "bg-[#34cf70] text-white",
    Upcoming: "bg-[#fd944e] text-white",
    Completed: "bg-red-500 text-white",
  };

  const getIcon = (type) => {
    switch (type) {
      case "Coding":
        return <Code className="w-8 h-8 text-[#fd944e]" />;
      case "MCQ":
        return <FileText className="w-8 h-8 text-[#000975]" />;
      default:
        return <FileText className="w-8 h-8 text-[#000975]" />;
    }
  };

  return (
    <motion.div whileHover={{ y: -5 }} className="w-full max-w-xl">
      <Card className="py-4 shadow-md bg-gradient-to-br from-white to-white rounded-2xl hover:shadow-2xl transition-all duration-300">
        <div className="ml-4 border-l-4 border-amber-400">
        <CardHeader className="flex justify-between items-center gap-5">
          <div className="flex gap-4 items-center">
            <div className="p-2 rounded-full">
              {getIcon(type)}
            </div>
            <div className="text-[#000975]">
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="text-sm">{category}</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 mb-4 rounded-full text-xs font-semibold ${statusStyles[status]}`}
          >
            {status}
          </span>
        </CardHeader>
        <CardBody className="grid grid-cols-3 gap-4 w-full">
  {Object.entries(stats).map(([key, value]) => (
    <div key={key} className="text-center">
      <p className="text-gray-600 text-lg inline-block">{key}</p>
      <h4 className="text-2xl font-medium inline-block ml-2">{value}</h4>
      
    </div>
  ))}
</CardBody>
        <CardFooter className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-4">
  <div className="flex flex-row gap-2">
    <div className="flex bg-white py-1 px-2 sm:py-1 sm:px-3 border rounded-full items-center gap-2">
      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="text-xs sm:text-xs">{date}</span>
    </div>
    <div className="flex bg-white py-1 px-2 sm:py-1 sm:px-3 border rounded-full items-center gap-2">
      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="text-xs sm:text-xs">{category}</span>
    </div>
    <div className="flex bg-white py-1 px-2 sm:py-1 sm:px-3 border rounded-full items-center gap-2">
      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="text-xs sm:text-xs">{type}</span>
    </div>
  </div>

  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={handleViewTest}
    className="w-1/9 sm:w-32 ml-11 px-1 py-2 bg-[#000975] text-white rounded-lg hover:bg-amber-500 transition-colors flex items-center justify-center font-light text-xs sm:text-base"
  >
    View Test
    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
  </motion.button>
</CardFooter>
</div>
       
      </Card>
    </motion.div>
  );
};

export default TestCard;
