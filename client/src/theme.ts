import { createTheme, alpha } from '@mui/material/styles';

// ── Emerald & Amber Drone Survey Palette ─────────────────────────────────
const emerald      = '#10B981';
const emeraldDark  = '#059669';
const emeraldLight = '#34D399';
const amber        = '#F59E0B';
const amberDark    = '#D97706';
const amberLight   = '#FCD34D';
const coral        = '#F43F5E';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: emerald,
      light: emeraldLight,
      dark: emeraldDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: amber,
      light: amberLight,
      dark: amberDark,
      contrastText: '#1C1917',
    },
    warning: {
      main: amber,
      light: amberLight,
      dark: amberDark,
    },
    error: {
      main: coral,
      light: '#FB7185',
      dark: '#E11D48',
    },
    success: {
      main: emerald,
      light: emeraldLight,
      dark: emeraldDark,
    },
    background: {
      default: '#F0FDF4',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    divider: '#D1FAE5',
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
    subtitle2: { fontWeight: 600, color: '#475569' },
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
        body: { backgroundColor: '#F0FDF4' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1FAE5',
          boxShadow: '0 1px 3px rgba(16,185,129,0.07), 0 1px 2px rgba(15,23,42,0.04)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 12px 32px ${alpha(emerald, 0.14)}`,
            borderColor: alpha(emerald, 0.3),
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
          background: `linear-gradient(135deg, ${emerald} 0%, ${emeraldDark} 100%)`,
          boxShadow: `0 4px 14px ${alpha(emerald, 0.38)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${emeraldLight} 0%, ${emerald} 100%)`,
            boxShadow: `0 6px 20px ${alpha(emerald, 0.48)}`,
          },
        },
        containedSecondary: {
          background: `linear-gradient(135deg, ${amber} 0%, ${amberDark} 100%)`,
          boxShadow: `0 4px 14px ${alpha(amber, 0.35)}`,
          color: '#1C1917',
          '&:hover': {
            background: `linear-gradient(135deg, ${amberLight} 0%, ${amber} 100%)`,
            boxShadow: `0 6px 20px ${alpha(amber, 0.45)}`,
          },
        },
        outlined: {
          borderColor: '#A7F3D0',
          '&:hover': {
            backgroundColor: alpha(emerald, 0.05),
            borderColor: emerald,
          },
        },
        text: {
          '&:hover': { backgroundColor: alpha(emerald, 0.06) },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #D1FAE5',
          boxShadow: '2px 0 8px rgba(16,185,129,0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #D1FAE5',
          boxShadow: '0 1px 4px rgba(16,185,129,0.08)',
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
            backgroundColor: '#F0FDF4',
            fontWeight: 700,
            color: '#475569',
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            borderBottom: `2px solid #D1FAE5`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#F0FDF4' },
          '&:last-child td': { borderBottom: 'none' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(emerald, 0.12),
          borderRadius: 6,
        },
        bar: {
          background: `linear-gradient(90deg, ${emerald}, ${emeraldLight})`,
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
