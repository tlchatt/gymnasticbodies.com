import React from 'react';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

export default function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="/">
        GymFit.Tv
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}
