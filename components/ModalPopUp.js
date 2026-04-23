import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

export default function ModalPopUp(props) {
  console.log("props:", props)
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  function onclick(name) {
    console.log("name:", name)
    if (name == "close") {
      return handleClose
    } else {
      return name
    }
  }
  return (
    <div>
      {props?.data[0]?.ButtonText &&
        <Button size='large' autoFocus variant='contained' onClick={handleOpen}>{props?.data[0]?.ButtonText}</Button>
      }

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style} style={{ boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)" }}>
          <Typography id="modal-modal-title" variant="h3" component="h3">
            {props?.data[0]?.title ?? "Add Title"}
          </Typography>
          <Typography id="modal-modal-description" variant="h5" component="h5" sx={{ mt: 2 }}>
            {props?.data[0]?.subTitle ?? "Add subTitle"}
          </Typography>

          {props?.data[0]?.SecondaryButtonText &&
            <Button sx={{ mt: 2, mr: 2 }} size='large' autoFocus variant='contained' onClick={onclick(props?.data[0]?.secondaryOnClick)}>{props?.data[0]?.SecondaryButtonText}</Button>
          }

          {props?.data[0]?.PrimaryButtonText &&
            <Button sx={{ mt: 2 }} size='large' autoFocus variant='contained' onClick={onclick(props?.data[0]?.primaryOnClick)}>{props?.data[0]?.PrimaryButtonText}</Button>
          }
        </Box>
      </Modal>
    </div>
  );
}
