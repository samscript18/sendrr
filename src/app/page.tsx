"use client";

import dynamic from "next/dynamic";

const HomeContent = dynamic(() => import("@/components/Home"), {
	ssr: false,
});

const Page = () => {
	return <HomeContent />;
};

export default Page;
