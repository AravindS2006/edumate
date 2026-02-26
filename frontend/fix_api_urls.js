const fs = require('fs');
const path = require('path');

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
};

const files = walk('c:/Users/aravi/Documents/GitHub/edumate/frontend/src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const replace1 = "const API = process.env.NEXT_PUBLIC_API_URL || '';";
    const target1 = "const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\\/$/, '');";

    const replace2 = "const API_URL = process.env.NEXT_PUBLIC_API_URL || '';";
    const target2 = "const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\\/$/, '');";

    if (content.includes(replace1)) {
        content = content.replace(replace1, target1);
        changed = true;
    }
    if (content.includes(replace2)) {
        content = content.replace(replace2, target2);
        changed = true;
    }

    // Handle page.tsx specific relative paths
    if (file.includes('app\\\\page.tsx') || file.includes('app/page.tsx')) {
        if (!content.includes('const API =')) {
            content = "const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\\/$/, '');\n" + content;
        }
        content = content.replace(/fetch\('\\/api\\/health'/g, "fetch(`${API}/api/health`");
        content = content.replace(/fetch\('\\/api\\/login'/g, "fetch(`${API}/api/login`");
        changed = true;
    }

    // Handle dashboard/page.tsx
    if (file.includes('dashboard\\\\page.tsx') || file.includes('dashboard/page.tsx')) {
        if (content.includes("const API = '';")) {
            content = content.replace("const API = '';", "const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\\/$/, '');");
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
