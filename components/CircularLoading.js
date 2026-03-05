import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function CircularIndeterminate({incomingStyle}) {
    console.log("incomingStyle:",incomingStyle)
    let finalStyle = {
        ...incomingStyle,
        display: 'flex', position: "absolute", alignItems: "center", justifyContent: "center", height: "100%", width: "100%"
    }

    return (
        <Box sx={finalStyle}>
            <CircularProgress />
        </Box>
    );
}