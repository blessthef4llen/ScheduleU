// components/AvailabilityPainter.tsx
import React, { useState } from 'react';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function AvailabilityPainter() {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const toggleSlot = (day: string, hour: number) => {
    const slot = `${day}-${hour}`;
    setSelectedSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-bold mb-4">Paint Your Busy Hours</h3>
      <div className="grid grid-cols-6 gap-1">
        <div /> {/* Empty corner */}
        {days.map(d => <div key={d} className="text-center font-semibold">{d}</div>)}
        
        {hours.map(h => (
          <React.Fragment key={h}>
            <div className="text-right pr-2 text-sm">{h}:00</div>
            {days.map(d => (
              <div
                key={`${d}-${h}`}
                onClick={() => toggleSlot(d, h)}
                className={`h-8 border cursor-pointer transition-colors ${
                  selectedSlots.includes(`${d}-${h}`) ? 'bg-red-500' : 'bg-gray-100 hover:bg-blue-200'
                }`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <button 
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => console.log("Saved Constraints:", selectedSlots)}
      >
        Save Constraints
      </button>
    </div>
  );
}