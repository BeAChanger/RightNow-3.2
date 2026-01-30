import React, { useState, useEffect, useRef } from 'react';

interface Props {
    onBack: () => void;
}

// Generate stages a-z but skip 'u' which is missing
const CHAR_CODES = Array.from({ length: 26 }, (_, i) => 97 + i)
    .filter(code => String.fromCharCode(code) !== 'u');

const IMAGES = CHAR_CODES.map(code => `/real_pro/${String.fromCharCode(code)}.png`);

const EvolutionGallery: React.FC<Props> = ({ onBack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Swipe state
    const touchStartX = useRef<number | null>(null);

    // Preload images for smoother scrubbing
    useEffect(() => {
        const preloadImages = async () => {
            const promises = IMAGES.map((src) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if error
                });
            });
            await Promise.allSettled(promises);
            setIsLoading(false);
        };
        preloadImages();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentIndex(Number(e.target.value));
    };

    // Swipe Handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;

        // Threshold for swipe
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                // Swipe Left -> Next
                setCurrentIndex(prev => Math.min(IMAGES.length - 1, prev + 1));
            } else {
                // Swipe Right -> Prev
                setCurrentIndex(prev => Math.max(0, prev - 1));
            }
        }
        touchStartX.current = null;
    };

    const currentImage = IMAGES[currentIndex];
    const progressPercent = (currentIndex / (IMAGES.length - 1)) * 100;

    return (
        <div className="h-screen bg-black flex flex-col relative overflow-hidden font-sans">
            {/* Background Blur Effect */}
            <div
                className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none transition-all duration-500"
                style={{
                    backgroundImage: `url(${currentImage})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover'
                }}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 z-40 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round">close</span>
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-serif text-[#B8FF00] tracking-[0.2em] uppercase mb-1 drop-shadow-[0_0_10px_rgba(184,255,0,0.5)]">Evolution Engine</span>
                    <span className="text-white font-bold text-lg font-mono">
                        {(currentIndex + 1).toString().padStart(2, '0')}
                        <span className="text-gray-600 mx-1">/</span>
                        {IMAGES.length}
                    </span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
                    <span className="material-icons-round">share</span>
                </button>
            </div>

            {/* Main Image Viewport (Swipeable) */}
            <div
                className="flex-1 flex items-center justify-center relative z-20 px-4"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Tap Zones - Overlay on top of image area */}
                <div
                    className="absolute inset-y-0 left-0 w-1/3 z-30 transform active:bg-white/5 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(prev => Math.max(0, prev - 1));
                    }}
                />
                <div
                    className="absolute inset-y-0 right-0 w-1/3 z-30 transform active:bg-white/5 transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(prev => Math.min(IMAGES.length - 1, prev + 1));
                    }}
                />

                <div className="relative w-full max-w-md aspect-[3.5/5] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                            <div className="w-8 h-8 rounded-full border-2 border-[#B8FF00] border-t-transparent animate-spin"></div>
                        </div>
                    )}

                    {/* Active Image */}
                    <img
                        src={currentImage}
                        alt={`Stage ${currentIndex}`}
                        className="w-full h-full object-cover transition-opacity duration-75"
                        draggable={false}
                    />

                    {/* Overlay Info */}
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none flex flex-col justify-end p-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[#B8FF00] font-bold text-xs mb-1 uppercase tracking-wider">Phase {String.fromCharCode(65 + currentIndex)}</p>
                                <p className="text-white text-2xl font-serif font-bold italic">
                                    {currentIndex === 0 ? 'Start Point' : currentIndex === IMAGES.length - 1 ? 'Final Goal' : 'In Progress'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Weight</p>
                                <p className="text-white font-mono font-bold">{(66.9 - (currentIndex * 0.1)).toFixed(1)} <span className="text-xs text-gray-500">kg</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Slider Controls */}
            <div className="relative z-50 pb-12 pt-6 px-8 bg-gradient-to-t from-black via-black/95 to-transparent">
                <div className="relative h-12 flex items-center justify-center max-w-md mx-auto w-full touch-none">
                    {/* Track Background */}
                    <div className="absolute left-0 right-0 h-1.5 bg-white/20 rounded-full overflow-hidden pointer-events-none">
                        {/* Progress Fill */}
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-[#B8FF00] shadow-[0_0_15px_#B8FF00] transition-all duration-75 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Native Slider (Invisible but clickable) */}
                    <input
                        type="range"
                        min={0}
                        max={IMAGES.length - 1}
                        step={1}
                        value={currentIndex}
                        onChange={handleChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50 active:cursor-grabbing"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    />

                    {/* Custom Thumb handle - separate div to follow position */}
                    <div
                        className="absolute w-8 h-8 rounded-full bg-[#B8FF00] border-4 border-black shadow-[0_0_20px_rgba(184,255,0,0.6)] z-40 pointer-events-none transform -translate-x-1/2 flex items-center justify-center transition-all duration-75 ease-out"
                        style={{ left: `${progressPercent}%` }}
                    >
                        <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    </div>
                </div>

                <div className="flex justify-between max-w-md mx-auto mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono pointer-events-none">
                    <span>Alpha</span>
                    <span>Omega</span>
                </div>
            </div>
        </div>
    );
};

export default EvolutionGallery;
