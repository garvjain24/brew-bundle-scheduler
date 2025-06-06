
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Coffee, Gift, Wallet, ShoppingBag, Calendar, Menu, X, ShoppingBasket, LogIn, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const location = useLocation();
  const { itemCount } = useCart();
  const isMobile = useIsMobile();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: "Home", path: "/", icon: <Coffee className="h-4 w-4" /> },
    { name: "Products", path: "/products", icon: <ShoppingBasket className="h-4 w-4" /> },
    { name: "Pickup", path: "/pickup", icon: <Calendar className="h-4 w-4" /> },
    { name: "Gift Cards", path: "/gift-cards", icon: <Gift className="h-4 w-4" /> },
    { name: "Wallet", path: "/wallet", icon: <Wallet className="h-4 w-4" /> },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Logout Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const headerClasses = cn(
    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out-expo w-full",
    isScrolled
      ? "py-3 glass-morphism shadow-sm"
      : "py-5 bg-transparent"
  );

  return (
    <>
      <header className={headerClasses}>
        <div className="container max-w-6xl mx-auto px-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-coffee-dark transition-all duration-300 hover:text-coffee"
          >
            <Coffee className="h-6 w-6" />
            <span className="font-display text-xl font-semibold">Brew Haven</span>
          </Link>

          {isMobile ? (
            <div className="flex items-center space-x-4">
              <Link to="/cart" className="relative">
                <ShoppingBag className="h-5 w-5 text-coffee-dark" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-coffee text-white text-xs font-medium rounded-full h-4 w-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              {user ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSignOut}
                  className="text-coffee-dark"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : (
                <Link to="/auth">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-coffee-dark"
                  >
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-coffee-dark"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          ) : (
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    location.pathname === item.path
                      ? "text-coffee-dark bg-cream"
                      : "text-coffee-dark/80 hover:text-coffee-dark hover:bg-cream/50"
                  )}
                >
                  <span className="flex items-center space-x-1.5">
                    {item.icon}
                    <span>{item.name}</span>
                  </span>
                </Link>
              ))}
              <Link to="/cart" className="relative ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-coffee-dark rounded-full h-9 w-9"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-coffee text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </Link>
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="ml-2 text-coffee-dark"
                    >
                      <User className="mr-2 h-4 w-4" />
                      {user.user_metadata.first_name || 'Account'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/wallet')}>
                      My Wallet
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pickup')}>
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="ml-2">
                  <Button
                    variant="ghost"
                    className="text-coffee-dark"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 pt-16 bg-background/95 backdrop-blur-sm"
          >
            <nav className="container flex flex-col space-y-2 p-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "p-3 rounded-lg text-base flex items-center space-x-3 transition-all",
                    location.pathname === item.path
                      ? "bg-cream text-coffee-dark font-medium"
                      : "text-coffee-dark/80 hover:bg-cream/50"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
              <Link
                to="/cart"
                className={cn(
                  "p-3 rounded-lg text-base flex items-center space-x-3 transition-all",
                  location.pathname === "/cart"
                    ? "bg-cream text-coffee-dark font-medium"
                    : "text-coffee-dark/80 hover:bg-cream/50"
                )}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Cart{itemCount > 0 && ` (${itemCount})`}</span>
              </Link>
              
              {user && (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="p-3 rounded-lg text-base flex items-center space-x-3 justify-start text-coffee-dark/80 hover:bg-cream/50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={isScrolled ? "h-16" : "h-20"} />
    </>
  );
};

export default Header;
