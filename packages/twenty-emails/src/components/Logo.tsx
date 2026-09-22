import { Img } from 'react-email';

const logoStyle = {
  marginBottom: '40px',
};

export const Logo = () => {
  return (
    <Img
      src="https://leapcrm.tech/images/branding/leap-logo.png"
      alt="Leap CRM logo"
      width="40"
      height="40"
      style={logoStyle}
    />
  );
};
