'use client';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { Box, Typography } from '@mui/material';
import { StandardContainer } from '@/components/StandardContainer/StandardContainer';
import { GetSettings } from '@/lib/GetSettings';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';


export default function Subscribe(props) {
    let { Settings, Style, Media } = GetSettings(props, "Checkout");

    let ContainerStyle = {
        ...Style,
        margin: `${Settings.standardMargin} 0`

    }
    let ContainerInnerStyle = {
        ...Style,
        placeContent: 'unset',
        gap: Settings.standardGap,
        gridAutoFlow: "column",
        justifyItems: "stretch"
    }
    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }
    let blockStyle = {
        background: "#fafafa",
        display: "grid",
        // borderRadius: "4px"
    }
    let featuresStyles = {
        padding: "12px 0 0",
        display:"grid",
        gridAutoFlow:"column",
        gap:"10px",
        justifyContent:"start",
        alignItems:"center"

    }
    let iconStyle = {
        color: "#f05621"
    }
    return (
        <>
            <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>OUR PLANS
            </Typography>
            {/* <Box sx={style}> */}
            {/* <StandardContainer style={ContainerStyle} innerStyle={ContainerInnerStyle} innerClassName="StandardContainerInnerMargin" id={Settings.id} innerID={Settings.innerID} {...props}> */}
            <Grid size={12} style={{ gridAutoFlow: "column", display: "grid", justifyContent: "center", gap: "20px" }}>
                <Paper elevation={3} rounded="true">
                    <Grid size={6} style={blockStyle} elevation={24}>
                        <Box >
                            <Grid size={6} style={{ display: "grid", justifyItems: "center", gap: Settings.lowGap, padding: Settings.highPadding }} >
                                {/* <Item>size=8</Item> */}
                                <Typography id="modal-modal-title" variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                                    MONTHLY
                                </Typography>
                                <Typography id="modal-modal-description" variant="h6" component="h2" sx={{ mt: 2 }}>
                                    $75 / month
                                </Typography>

                                <Button
                                    type="button"
                                    variant="contained"
                                    color="primary"
                                    href={"/checkout?amount=0.02&term=monthly"}
                                    style={{ fontSize: "1rem", letterSpacing: 1, background: "linear-gradient(18deg, #fcb14e 0%, #f05621 100%) !important", }}
                                // onClick={() => handleContactForm()}
                                >
                                    SUBSCRIBE
                                </Button>
                                <Typography id="modal-modal-description" variant="p" component="p" >
                                    ($75 billed monthly)
                                </Typography>
                            </Grid>
                        </Box>
                    </Grid>
                </Paper>
                <Paper elevation={3} rounded="true">
                    <Grid size={6} style={blockStyle} elevation={3}>
                        <Box>
                            <Grid size={6} style={{ display: "grid", justifyItems: "center", gap: Settings.lowGap, padding: Settings.highPadding }} >
                                {/* <Item>size=4</Item> */}
                                <Typography id="modal-modal-title" variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                                    ANNUALLY
                                </Typography>
                                <Typography id="modal-modal-description" variant="h6" component="h2" sx={{ mt: 2 }}>
                                    $60 / month
                                </Typography>

                                <Button
                                    type="button"
                                    variant="contained"
                                    color="primary"
                                    href={"/checkout?amount=0.01&term=anually"}
                                    style={{ fontSize: "1rem", letterSpacing: 1, background: "linear-gradient(18deg, #fcb14e 0%, #f05621 100%) !important", }}
                                // onClick={() => handleContactForm()}
                                >
                                    SUBSCRIBE
                                </Button>
                                <Typography id="modal-modal-description" variant="p" component="p" >
                                    ($720 billed annually)
                                </Typography>
                            </Grid>
                        </Box>
                    </Grid>
                </Paper>
            </Grid>


            <Grid size={6} style={{ display: "grid", marginTop: "20px", justifyItems: "center" }} elevation={24}>
                <Box >

                    {/* <Item>size=8</Item> */}

                    <Typography id="modal-modal-title" variant="p" component="p" style={featuresStyles}>
                        <FileDownloadDoneIcon style={iconStyle} /> Now includes our nutrition course Thrive
                    </Typography>
                    <Typography id="modal-modal-title" variant="p" component="p" style={featuresStyles}>
                        <FileDownloadDoneIcon style={iconStyle} /> Over 350 Strength exercises, 300 mobility exercises and 75 Handstand exercises to deliver noticeable results in less time
                    </Typography>
                    <Typography id="modal-modal-title" variant="p" component="p" style={featuresStyles}>
                        <FileDownloadDoneIcon style={iconStyle} /> Customizable training to match your fitness level and goals
                    </Typography>
                    <Typography id="modal-modal-title" variant="p" component="p" style={featuresStyles}>
                        <FileDownloadDoneIcon style={iconStyle} /> 6+ Week Programs that adapt as you progress
                    </Typography>
                    <Typography id="modal-modal-title" variant="p" component="p" style={featuresStyles}>
                        <FileDownloadDoneIcon style={iconStyle} /> Short, Medium and Long workouts to suit your schedule
                    </Typography>
                </Box>
            </Grid>



            {/* </StandardContainer> */}
        </>
    );
}