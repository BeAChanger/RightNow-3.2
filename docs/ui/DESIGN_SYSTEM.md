# 设计系统

## 颜色

### 主色调
```css
--primary: #B8FF00;      /* 荧光绿 - 主色 */
--background: #030303;   /* 深黑 - 背景 */
--surface: #0D0D0D;      /* 浅黑 - 卡片背景 */
--text: #FFFFFF;         /* 白色 - 主文字 */
--text-secondary: #999;  /* 灰色 - 次要文字 */
```

### 语义颜色
```css
--success: #00FF88;
--warning: #FFB800;
--error: #FF3B30;
--info: #00A8FF;
```

## 字体

### 字体家族
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### 字体大小
```css
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

### 字重
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-black: 900;
```

## 间距

```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
```

## 圆角

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-full: 9999px;
```

## 阴影

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
```

## Tailwind配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#B8FF00',
        background: '#030303',
        surface: '#0D0D0D',
      }
    }
  }
}
```
