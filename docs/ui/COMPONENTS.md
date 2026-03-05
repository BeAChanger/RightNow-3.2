# 组件库

## Button

### 基础按钮
```tsx
<button className="bg-primary text-background px-6 py-3 rounded-lg font-semibold">
  确认
</button>
```

### 次要按钮
```tsx
<button className="border border-primary text-primary px-6 py-3 rounded-lg">
  取消
</button>
```

## Card

```tsx
<div className="bg-surface rounded-xl p-4">
  <h3 className="text-lg font-semibold mb-2">标题</h3>
  <p className="text-text-secondary">内容</p>
</div>
```

## Input

```tsx
<input
  className="bg-surface border border-gray-700 rounded-lg px-4 py-3 w-full text-white"
  placeholder="请输入"
/>
```

## Modal

```tsx
<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
  <div className="bg-surface rounded-2xl p-6 max-w-sm w-full">
    {/* 内容 */}
  </div>
</div>
```

## BottomNav

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-800 pb-safe">
  <div className="flex justify-around py-2">
    {/* 导航项 */}
  </div>
</nav>
```
