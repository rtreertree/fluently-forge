import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	devIndicators: false,
	experimental: {
		serverActions: {
			bodySizeLimit: '5mb'
		}
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	rules: {
		"@typescript-eslint/no-unused-vars": false
	}
};

export default nextConfig;
