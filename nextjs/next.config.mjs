/** @type {import('next').NextConfig} */
const nextConfig = {
    // The component library ships as TypeScript source.
    transpilePackages: ["@flock-community/atlas-ui"],
    // login.html posts to xas/, as the Mendix login page does.
    skipTrailingSlashRedirect: true,
    reactStrictMode: true
};

export default nextConfig;
