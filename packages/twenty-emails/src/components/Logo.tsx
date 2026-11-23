import { Img } from 'react-email';

const logoStyle = {
  marginBottom: '40px',
};

export const Logo = () => {
  return (
    <Img
      src="https://leapcrm.tech/images/branding/your-jugaad-wordmark.png"
      alt="Your Jugaad CRM logo"
      width="135"
      height="32"
      style={logoStyle}
    />
  );
};
