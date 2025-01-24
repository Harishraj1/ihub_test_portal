import React from "react";
import { FaCheckCircle } from "react-icons/fa"; // Replace with your desired icon

const StatsCard = ({ icon, title, value }) => {
  return (
    <div className="w-80 h-28 bg-white rounded-[15px] shadow-md">
      <div className="p-6 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-normal text-base text-[#a0aec0] font-sans">
            {title}
          </span>
          <span className="font-bold text-lg text-[#2d3748] font-sans leading-[25.2px]">
            {value}
          </span>
        </div>
        <div className="w-[45px] h-[45px] bg-[#000975] text-xl text-white rounded-xl flex items-center justify-center shadow-[0px_3.5px_5.5px_#00000005]">
          {icon || <FaCheckCircle className="w-[22px] h-[22px] text-white" />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
