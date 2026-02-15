/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: 'https://edumate-sairam.vercel.app',
    generateRobotsTxt: true,
    exclude: ['/dashboard/*', '/api/*'],
    robotsTxtOptions: {
        policies: [
            { userAgent: '*', allow: '/' },
            { userAgent: '*', disallow: ['/dashboard', '/api'] },
        ],
    },
}
