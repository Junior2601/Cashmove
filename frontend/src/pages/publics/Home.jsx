import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="p-6 text-center">

      <h1 className="text-3xl font-bold mb-6">
        Transfert d'argent
      </h1>

      <div className="space-x-4">
        <Link to="/transaction" className="bg-blue-600 text-white px-4 py-2">
          Envoyer
        </Link>

        <Link to="/tracking" className="bg-gray-600 text-white px-4 py-2">
          Suivre
        </Link>
      </div>

    </div>
  );
}