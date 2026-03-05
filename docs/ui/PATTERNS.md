# 交互模式

## 页面导航

使用枚举 + setState 切换视图:
```tsx
enum View { Dashboard, AIChat, Community }
const [currentView, setCurrentView] = useState(View.Dashboard);
```

## 表单提交

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // 提交逻辑
};
```

## 图片上传

```tsx
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }
};
```

## 加载状态

```tsx
{isLoading ? (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
  </div>
) : (
  <Content />
)}
```

## 错误处理

```tsx
{error && (
  <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
    {error}
  </div>
)}
```
