import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function CircularIndeterminate() {
    return (
        <Box sx={{ display: 'flex', position:"absolute",alignItems:"center",justifyContent:"center", height: "100%", width: "100%" }}>
            <CircularProgress />
        </Box>
    );
}