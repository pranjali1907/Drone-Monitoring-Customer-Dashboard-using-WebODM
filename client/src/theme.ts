import { createTheme, alpha } from '@mui/material/styles';

const indigo = '#6366F1';
const indigoDark = '#4F46E5';
const indigoLight = '#818CF8';
const teal = '#14B8A6';
const amber = '#F59E0B';
const rose = '#F43F5E';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: indigo,
      light: indigoLight,
      dark: indigoDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: teal,
      light: '#2DD4BF',
      dark: '#0D9488',
      contrastText: '#ffffff',
    },
    warning: {
      main: amber,
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: rose,
      light: '#FB7185',
      dark: '#E11D48',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.03em' },
    h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    button: {
      fontFamily: '"Outfit", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, color: '#64748B' },
  },
  shape: { borderRadius: 14 },
  shadows: [
    'none',
    '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    '0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)',
    '0 10px 15px -3px rgba(15,23,42,0.07), 0 4px 6px -4px rgba(15,23,42,0.05)',
    '0 20px 25px -5px rgba(15,23,42,0.08), 0 8px 10px -6px rgba(15,23,42,0.05)',
    '0 25px 50px -12px rgba(15,23,42,0.12)',
    '0 25px 50px -12px rgba(15,23,42,0.14)',
    '0 25px 50px -12px rgba(15,23,42,0.16)',
    '0 25px 50px -12px rgba(15,23,42,0.18)',
    '0 25px 50px -12px rgba(15,23,42,0.20)',
    '0 25px 50px -12px rgba(15,23,42,0.22)',
    '0 25px 50px -12px rgba(15,23,42,0.24)',
    '0 25px 50px -12px rgba(15,23,42,0.26)',
    '0 25px 50px -12px rgba(15,23,42,0.28)',
    '0 25px 50px -12px rgba(15,23,42,0.30)',
    '0 25px 50px -12px rgba(15,23,42,0.32)',
    '0 25px 50px -12px rgba(15,23,42,0.34)',
    '0 25px 50px -12px rgba(15,23,42,0.36)',
    '0 25px 50px -12px rgba(15,23,42,0.38)',
    '0 25px 50px -12px rgba(15,23,42,0.40)',
    '0 25px 50px -12px rgba(15,23,42,0.42)',
    '0 25px 50px -12px rgba(15,23,42,0.44)',
    '0 25px 50px -12px rgba(15,23,42,0.46)',
    '0 25px 50px -12px rgba(15,23,42,0.48)',
    '0 25px 50px -12px rgba(15,23,42,0.50)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F1F5F9' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 12px 32px ${alpha(indigo, 0.12)}`,
            borderColor: alpha(indigo, 0.25),
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${indigo} 0%, ${indigoDark} 100%)`,
          boxShadow: `0 4px 14px ${alpha(indigo, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${indigoLight} 0%, ${indigo} 100%)`,
            boxShadow: `0 6px 20px ${alpha(indigo, 0.45)}`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${teal} 0%, #0D9488 100%)`,
          boxShadow: `0 4px 14px ${alpha(teal, 0.35)}`,
          '&:hover': {
            background: `linear-gradient(135deg, #2DD4BF 0%, ${teal} 100%)`,
            boxShadow: `0 6px 20px ${alpha(teal, 0.45)}`,
          },
        },
        outlined: {
          borderColor: '#CBD5E1',
          '&:hover': {
            backgroundColor: alpha(indigo, 0.04),
            borderColor: indigo,
          },
        },
        text: {
          '&:hover': { backgroundColor: alpha(indigo, 0.06) },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          boxShadow: '2px 0 8px rgba(15,23,42,0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          color: '#0F172A',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontFamily: '"Outfit", sans-serif' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#F8FAFC',
            fontWeight: 700,
            color: '#475569',
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: '2px solid #E2E8F0',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F8FAFC' },
          '&:last-child td': { borderBottom: 'none' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(indigo, 0.1),
          borderRadius: 6,
        },
        bar: {
          background: `linear-gradient(90deg, ${indigo}, ${indigoLight})`,
          borderRadius: 6,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
