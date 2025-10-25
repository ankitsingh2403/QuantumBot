import styles from "./Button.module.css";

type Props = {
	buttonLabel: string;
	type: "button" | "submit" | "reset";
	className?: string;
	onClick?: () => void;
};

const Button = (props: Props) => {
	return (
		<button 
			type={props.type} 
			className={`${styles.button} ${props.className}`}
			onClick={props.onClick}
		>
			{props.buttonLabel}
		</button>
	);
};

export default Button;
