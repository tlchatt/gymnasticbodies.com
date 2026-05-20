// Test: Verify Google Analytics is loading on the live site
// Run with: node claudePlans/test-analytics.js

const https = require('https');

const URL = 'https://app.gymnasticbodies.com';

https.get(URL, (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
        const checks = [
            {
                name: 'gtag.js script tag present',
                pass: html.includes('googletagmanager.com/gtag/js'),
            },
            {
                name: 'GA tag ID present (G-6V1QXBQ18K)',
                pass: html.includes('G-6V1QXBQ18K'),
            },
            {
                name: 'gtag initialization code present',
                pass: html.includes('window.dataLayer') && html.includes("gtag('config'"),
            },
        ];

        console.log(`\nGoogle Analytics checks for ${URL}\n`);
        let allPassed = true;
        for (const check of checks) {
            const status = check.pass ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status}  ${check.name}`);
            if (!check.pass) allPassed = false;
        }
        console.log(allPassed ? '\nAll checks passed — GA is live.\n' : '\nSome checks failed — GA may not be tracking.\n');
    });
}).on('error', (err) => {
    console.error('Request failed:', err.message);
});
