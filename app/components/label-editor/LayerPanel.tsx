'use client';

import React, { useState } from 'react';
import { LabelElement } from '@/lib/types/label-system';
import { Lock, Unlock, GripVertical, Type, Image as ImageIcon, QrCode, Square, Tag, Eye, EyeOff } from 'lucide-react';

interface LayerPanelProps {
    elements: LabelElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onUpdate: (id: string, updates: Partial<LabelElement>) => void;
}

export default function LayerPanel({ elements, selectedId, onSelect, onReorder, onUpdate }: LayerPanelProps) {
    // We display elements in reverse order so "Top" layer is at the top of the list
    // indices in this list: 0 = Top Most (End of array), N = Bottom Most (Start of array)
    // We need to map display index back to array index
    const displayElements = [...elements].reverse();

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const getIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type size={14} />;
            case 'image': return <ImageIcon size={14} />;
            case 'qr-code': return <QrCode size={14} />;
            case 'shape': return <Square size={14} />;
            case 'brand-logo': return <ImageIcon size={14} className="text-cyan-400" />;
            case 'brand-footer': return <Tag size={14} className="text-cyan-400" />;
            default: return <Square size={14} />;
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 Drag ghost image is automatic
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        // Convert display indices to array indices
        // display[0] is array[len-1]
        // display[i] is array[len-1-i]
        
        const fromArrayIndex = elements.length - 1 - draggedIndex;
        const toArrayIndex = elements.length - 1 - dropIndex;

        onReorder(fromArrayIndex, toArrayIndex);
        setDraggedIndex(null);
    };

    return (
        <div className="flex flex-col w-full">
             {displayElements.length === 0 && (
                 <div className="text-center text-zinc-600 text-xs py-4">Keine Ebenen</div>
             )}
             
             {displayElements.map((el, index) => {
                 // Check if it's a locked background or branding in simple mode (optional logic, usually UI handles it)
                 const isSelected = el.id === selectedId;
                 
                 return (
                     <div
                        key={el.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => onSelect(el.id)}
                        className={`
                            group flex items-center justify-between py-2 px-1 border-b border-zinc-800/50 select-none cursor-pointer transition-colors
                            ${isSelected ? 'bg-cyan-950/20' : 'hover:bg-zinc-800/50'}
                            ${draggedIndex === index ? 'opacity-20' : ''}
                        `}
                     >
                         <div className="flex items-center gap-3 overflow-hidden">
                             <div className="text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing transition-colors">
                                 <GripVertical size={14} />
                             </div>
                             <div className={`text-zinc-500 ${isSelected ? 'text-cyan-400' : ''}`}>
                                 {getIcon(el.type)}
                             </div>
                             <span className={`text-xs truncate max-w-[120px] ${isSelected ? 'text-cyan-100 font-medium' : 'text-zinc-400'}`}>
                                 {el.name || (el.type === 'text' ? (el.content.substring(0, 15) || 'Text') : el.type)}
                             </span>
                         </div>
                         
                         <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                             {/* Lock Toggle */}
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate(el.id, { isLocked: !el.isLocked });
                                }}
                                className={`p-1 rounded hover:bg-zinc-700/50 ${el.isLocked ? 'text-amber-500' : 'text-zinc-700 hover:text-zinc-400'}`}
                                title={el.isLocked ? "Entsperren" : "Sperren"}
                             >
                                 {el.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                             </button>
                         </div>
                     </div>
                 );
             })}
        </div>
    );
}
