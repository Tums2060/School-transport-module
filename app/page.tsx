import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">School System Demo</h1>
        <Link 
          href="/buses" 
          className="bg-teal-700 text-white px-6 py-3 rounded shadow hover:bg-teal-800 transition"
        >
          Open Transport Module
        </Link>
      </div>
    </div>
  );
}