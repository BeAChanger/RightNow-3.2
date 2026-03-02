import React, { useRef, useState } from 'react';
import { getApiErrorMessage, userApi } from '../api';

interface Props {
  onComplete: (
    bodyImage: string | null,
    isComplete?: boolean,
    gender?: 'male' | 'female',
    bodyStyle?: string,
    idealImage?: string | null,
  ) => void;
}

type BodyStyleOption = {
  id: string;
  label: string;
  description: string;
  image: string;
};

const BODY_STYLE_OPTIONS: Record<'male' | 'female', BodyStyleOption[]> = {
  male: [
    { id: 'slim', label: '薄肌型', description: '线条分明，精瘦有型', image: '/man-models/薄肌型.png' },
    { id: 'athletic', label: '力量型', description: '均衡发展，注重运动表现', image: '/man-models/力量型.png' },
    { id: 'muscular', label: '健美型', description: '大框架，追求肌肉量', image: '/man-models/健美型.png' },
  ],
  female: [
    { id: 'comic', label: '漫画型', description: '轻盈纤细，线条柔和', image: '/woman-models/漫画型.png' },
    { id: 'athletic', label: '力量型', description: '强壮均衡，运动感', image: '/woman-models/力量型.png' },
    { id: 'muscular', label: '健美型', description: '力量优先，肌肉轮廓', image: '/woman-models/健美型.png' },
  ],
};

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bodyStyle, setBodyStyle] = useState('');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(62.5);
  const [age, setAge] = useState(26);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customIdealImage, setCustomIdealImage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const readAsDataUrl = (file: File, onLoad: (result: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => onLoad(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleBodyImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readAsDataUrl(file, setSelectedImage);
    }
    event.target.value = '';
  };

  const handleIdealImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readAsDataUrl(file, (result) => {
        setCustomIdealImage(result);
        setBodyStyle('custom');
      });
    }
    event.target.value = '';
  };

  const handleSkip = () => {
    if (submitting) {
      return;
    }

    if (step < 3) {
      setSubmitError('');
      onComplete(null, false, gender, bodyStyle, customIdealImage);
      return;
    }

    void handleComplete();
  };

  const handleComplete = async () => {
    setSubmitError('');
    setSubmitting(true);

    try {
      await userApi.onboarding({
        gender,
        height,
        weight,
        age,
        bodyStyle: bodyStyle || undefined,
      });

      onComplete(selectedImage, true, gender, bodyStyle, customIdealImage);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, '暂时无法保存你的资料，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setSubmitError('');
      setStep((prev) => prev + 1);
      return;
    }

    void handleComplete();
  };

  const nextDisabled =
    submitting ||
    (step === 2 && !bodyStyle) ||
    (step === 3 && !selectedImage);

  const renderMetricsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setGender('male')}
          className={`relative overflow-hidden rounded-[24px] border px-4 py-5 text-center transition-all ${gender === 'male'
            ? 'border-[#B8FF00] bg-gradient-to-br from-[#B8FF00]/20 to-transparent'
            : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
        >
          <div className={`text-lg font-bold ${gender === 'male' ? 'text-[#B8FF00]' : 'text-white/70'}`}>男性</div>
        </button>
        <button
          type="button"
          onClick={() => setGender('female')}
          className={`relative overflow-hidden rounded-[24px] border px-4 py-5 text-center transition-all ${gender === 'female'
            ? 'border-[#B8FF00] bg-gradient-to-br from-[#B8FF00]/20 to-transparent'
            : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
        >
          <div className={`text-lg font-bold ${gender === 'female' ? 'text-[#B8FF00]' : 'text-white/70'}`}>女性</div>
        </button>
      </div>

      <div className="space-y-4">
        <label className="block rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors focus-within:border-[#B8FF00]/50 focus-within:bg-white/10">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70 tracking-wide">身高 / Height</span>
            <div className="flex items-end gap-1">
              <input
                type="number"
                min="100"
                max="220"
                step="1"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-16 bg-transparent p-0 text-right font-mono text-2xl font-bold text-white outline-none"
              />
              <span className="pb-1 text-xs font-bold text-[#B8FF00]">cm</span>
            </div>
          </div>
          <input
            type="range"
            min="100"
            max="220"
            step="1"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-[#B8FF00] h-1.5 bg-black/50 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#B8FF00] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(184,255,0,0.5)]"
          />
        </label>

        <label className="block rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors focus-within:border-[#B8FF00]/50 focus-within:bg-white/10">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70 tracking-wide">体重 / Weight</span>
            <div className="flex items-end gap-1">
              <input
                type="number"
                min="30"
                max="150"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-20 bg-transparent p-0 text-right font-mono text-2xl font-bold text-white outline-none"
              />
              <span className="pb-1 text-xs font-bold text-[#B8FF00]">kg</span>
            </div>
          </div>
          <input
            type="range"
            min="30"
            max="150"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full accent-[#B8FF00] h-1.5 bg-black/50 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#B8FF00] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(184,255,0,0.5)]"
          />
        </label>

        <label className="block rounded-[24px] border border-white/10 bg-white/5 p-6 transition-colors focus-within:border-[#B8FF00]/50 focus-within:bg-white/10">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-white/70 tracking-wide">年龄 / Age</span>
            <div className="flex items-end gap-1">
              <input
                type="number"
                min="12"
                max="80"
                step="1"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-16 bg-transparent p-0 text-right font-mono text-2xl font-bold text-white outline-none"
              />
              <span className="pb-1 text-xs font-bold text-[#B8FF00]">岁</span>
            </div>
          </div>
          <input
            type="range"
            min="12"
            max="80"
            step="1"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full accent-[#B8FF00] h-1.5 bg-black/50 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#B8FF00] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(184,255,0,0.5)]"
          />
        </label>
      </div>
    </div>
  );

  const renderBodyStyleStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {BODY_STYLE_OPTIONS[gender].map((option) => {
          const selected = bodyStyle === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setBodyStyle(option.id)}
              className={`rounded-3xl border overflow-hidden text-center transition-all bg-[#0A0A0A] ${selected
                ? 'border-[#B8FF00] shadow-[0_0_20px_rgba(184,255,0,0.15)] bg-[#B8FF00]/10'
                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
            >
              <div className="relative h-[160px] bg-gradient-to-b from-transparent to-black/60 overflow-hidden flex items-end justify-center pt-2">
                <img
                  src={option.image}
                  alt={option.label}
                  className={`w-full h-full object-cover object-top transition-transform duration-500 ease-out select-none ${selected ? 'scale-[1.05]' : 'scale-100'}`}
                />
              </div>
              <div className="p-3 bg-black/60 backdrop-blur-sm border-t border-white/5 relative z-10 min-h-[60px] flex flex-col justify-center">
                <div className={`text-sm font-bold tracking-wide ${selected ? 'text-[#B8FF00]' : 'text-white'}`}>{option.label}</div>
                <div className="text-[10px] text-white/50 mt-1 leading-[1.3] hidden sm:block">{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <input
        id="ideal-body-image-input"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleIdealImageChange}
      />

      <label
        htmlFor="ideal-body-image-input"
        className={`block w-full rounded-3xl border border-dashed p-4 text-left transition-all cursor-pointer ${bodyStyle === 'custom'
          ? 'border-[#B8FF00] bg-[#B8FF00]/10'
          : 'border-white/20 bg-white/5 hover:bg-white/10'
          }`}
      >
        <div className="mb-1 text-sm font-semibold text-white">
          {customIdealImage ? '替换自定义理想体型图' : '上传自定义理想体型图'}
        </div>
        <div className="text-xs text-white/60">
          {customIdealImage ? '已选择自定义目标' : '用你自己的参考图替代预设选项'}
        </div>
      </label>
    </div>
  );

  const renderBodyImageStep = () => (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleBodyImageChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBodyImageChange}
      />

      <div className="overflow-hidden rounded-[28px] border-2 border-dashed border-white/15 bg-white/5">
        {selectedImage ? (
          <img src={selectedImage} alt="Body preview" className="h-[320px] w-full object-contain bg-black" />
        ) : (
          <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-white/40">
            上传一张全身照，用于生成初始进化模型
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 transition-all hover:bg-white/10"
        >
          拍照
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 transition-all hover:bg-white/10"
        >
          相册
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05040a] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 1 && setStep((prev) => prev - 1)}
            className={`rounded-full p-2 transition-all ${step === 1 ? 'invisible' : 'hover:bg-white/10'}`}
          >
            <span className="material-icons-round">arrow_back</span>
          </button>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-[0.2em]">
            第 {step}/3 步
          </span>
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            跳过
          </button>
        </div>

        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-black text-white">
            {step === 1 && '构建你的身体档案'}
            {step === 2 && '选择理想体型'}
            {step === 3 && '上传身体照片'}
          </h1>
          <p className="text-sm text-white/50">
            {step === 1 && '这些数据将作为初始身体模型的基础'}
            {step === 2 && '选择 AI 进化的目标体型方向'}
            {step === 3 && '上传全身照可以获得最精准的效果'}
          </p>
        </header>

        <main className="flex-1">
          {step === 1 && renderMetricsStep()}
          {step === 2 && renderBodyStyleStep()}
          {step === 3 && renderBodyImageStep()}
        </main>

        <footer className="mt-8">
          {submitError && (
            <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
              {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold transition-all ${nextDisabled
              ? 'cursor-not-allowed bg-white/10 text-white/30'
              : 'bg-[#B8FF00] text-black shadow-[0_0_25px_rgba(184,255,0,0.25)]'
              }`}
          >
            <span>{submitting ? '保存中...' : step === 3 ? '创建档案' : '下一步'}</span>
            <span className="material-icons-round">arrow_forward</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Onboarding;
