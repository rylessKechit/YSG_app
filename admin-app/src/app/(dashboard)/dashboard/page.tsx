export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards pour le moment */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Préparateurs actifs</h3>
          <p className="text-3xl font-bold text-gray-900">24</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Ponctualité</h3>
          <p className="text-3xl font-bold text-green-600">94%</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Préparations aujourd'hui</h3>
          <p className="text-3xl font-bold text-blue-600">187</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Temps moyen</h3>
          <p className="text-3xl font-bold text-gray-900">23min</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Bienvenue dans Vehicle Prep Admin!</h2>
        <p className="text-gray-600">
          Votre tableau de bord d'administration est maintenant configuré. 
          Les prochains chapitres ajouteront les fonctionnalités complètes.
        </p>
      </div>
    </div>
  );
}