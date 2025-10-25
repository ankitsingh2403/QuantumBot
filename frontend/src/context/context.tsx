import {
	userLogin,
	getAuthStatus,
	logoutUser,
	userSignup,
} from "../../helpers/api-functions";
import {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";

type User = {
	name: string;
	email: string;
};

type UserAuth = {
	user: User | null;
	isLoggedIn: boolean;
	login: (email: string, password: string) => Promise<void>;
	signup: (name: string, email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
};

const AuthContext = createContext<UserAuth | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [loading, setLoading] = useState(true);

	// ✅ Check if user cookies/session are valid
	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const data = await getAuthStatus();
				if (data) {
					setUser({ email: data.email, name: data.name });
					setIsLoggedIn(true);
				}
			} catch (err: any) {
				// Handle 401 Unauthorized gracefully
				console.warn("User not logged in yet or session expired:", err.message);
				setUser(null);
				setIsLoggedIn(false);
			} finally {
				setLoading(false);
			}
		};
		checkAuthStatus();
	}, []);

	const login = async (email: string, password: string) => {
		const data = await userLogin(email, password);
		if (data) {
			setUser({ email: data.email, name: data.name });
			setIsLoggedIn(true);
		}
	};

	const signup = async (name: string, email: string, password: string) => {
		await userSignup(name, email, password);
	};

	const logout = async () => {
		await logoutUser();
		setIsLoggedIn(false);
		setUser(null);
		window.location.reload(); // reload webpage
	};

	const value = {
		user,
		isLoggedIn,
		login,
		logout,
		signup,
	};

	// ✅ Prevent rendering children until auth check completes
	if (loading) {
		return <div>Loading...</div>;
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
