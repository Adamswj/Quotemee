import { Card, CardContent } from "@/components/ui/card";

// Helper function to get category icon
const getCategoryIcon = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'finance':
      return <span className="text-white text-2xl">💰</span>;
    case 'history':
      return <span className="text-white text-2xl">📜</span>;
    case 'love':
      return <span className="text-white text-2xl">❤️</span>;
    case 'philosophy':
      return <span className="text-white text-2xl">💭</span>;
    case 'religion':
      return <span className="text-white text-2xl">✨</span>;
    case 'science':
      return <span className="text-white text-2xl">🔬</span>;
    default:
      return <span className="text-white text-2xl">📖</span>;
  }
};

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
  quotesCount?: number;
}

export default function CategoryCard({ category, onClick, quotesCount }: CategoryCardProps) {
  return (
    <Card 
      className="hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
          {getCategoryIcon(category.name)}
        </div>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
          {category.name}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {quotesCount ? `${quotesCount} quotes` : 'Explore quotes'}
        </p>
      </CardContent>
    </Card>
  );
}
