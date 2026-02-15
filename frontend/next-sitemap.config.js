/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://edumate-sairam.vercel.app',
    generateRobotsTxt: true,
    exclude: ['/dashboard', '/dashboard/*', '/api*'],
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/dashboard', '/dashboard/*', '/api', '/api/*'],
            },
        ],
    },
}
