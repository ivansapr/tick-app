import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { TickAPI } from "../lib/api";
import { TickRole } from "../types/tick";

interface AuthContextType {
  isAuthenticated: boolean;
  email: string | null;
  subscriptionId: string | null;
  subscriptionName: string | null;
  api: TickAPI | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  selectSubscription: (role: TickRole, userEmail?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionName, setSubscriptionName] = useState<string | null>(null);
  const [api, setApi] = useState<TickAPI | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("tick_email");
    const savedToken = localStorage.getItem("tick_token");
    const savedSubscriptionId = localStorage.getItem("tick_subscription_id");
    const savedSubscriptionName = localStorage.getItem(
      "tick_subscription_name",
    );

    if (savedEmail && savedToken && savedSubscriptionId) {
      const tickApi = new TickAPI({
        email: savedEmail,
        token: savedToken,
        subscriptionId: savedSubscriptionId,
      });
      setApi(tickApi);
      setEmail(savedEmail);
      setSubscriptionId(savedSubscriptionId);
      setSubscriptionName(savedSubscriptionName);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const tickApi = new TickAPI({
        email,
        password,
      });

      const roles = await tickApi.authenticate();

      console.log("Authentication response:", roles);

      if (!roles || roles.length === 0) {
        console.error("No roles returned from authentication");
        return false;
      }

      console.log("First role:", roles[0]);

      // If only one subscription, auto-select it
      if (roles.length === 1) {
        selectSubscription(roles[0], email);
        return true;
      }

      // Multiple subscriptions - save email and wait for selection
      setEmail(email);
      setApi(tickApi);

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const selectSubscription = (role: TickRole, userEmail?: string) => {
    const emailToUse = userEmail || email || "user@tick.com";
    const subName =
      role.subscription?.name || `Subscription ${role.subscription_id}`;

    const tickApi = new TickAPI({
      email: emailToUse,
      token: role.api_token,
      subscriptionId: role.subscription_id,
    });

    setApi(tickApi);
    setEmail(emailToUse);
    setSubscriptionId(role.subscription_id);
    setSubscriptionName(subName);
    setIsAuthenticated(true);

    // Save to localStorage
    localStorage.setItem("tick_email", emailToUse);
    localStorage.setItem("tick_token", role.api_token);
    localStorage.setItem("tick_subscription_id", role.subscription_id);
    localStorage.setItem("tick_subscription_name", subName);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setEmail(null);
    setSubscriptionId(null);
    setSubscriptionName(null);
    setApi(null);

    localStorage.removeItem("tick_email");
    localStorage.removeItem("tick_token");
    localStorage.removeItem("tick_subscription_id");
    localStorage.removeItem("tick_subscription_name");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        email,
        subscriptionId,
        subscriptionName,
        api,
        login,
        logout,
        selectSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
