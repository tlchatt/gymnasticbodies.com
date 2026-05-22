import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Checkout from '@/app/checkout/page';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 3,
  width: '90vw',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export default function ModalPopUp(props) {
  console.log("props:", props?.userData)
  const [open, setOpen] = React.useState(props?.paywall ?? false);
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

  console.log("props?.SecondaryButtonPosition:", props)

  let secondaryButtonTextStyle = { mt: 2, mr: 2, float: props?.data?.SecondaryButtonPosition ?? "left" }

  return (
    <div>
      {props?.data?.ButtonText && !props?.test &&
        <Button size='large' autoFocus variant='contained' onClick={handleOpen}>{props?.data?.ButtonText}</Button>
      }

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style} style={{ boxShadow: "0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2),0 4px 5px 0 rgba(0,0,0,0.14)" }}>

          {props?.data?.title &&
            <Typography id="modal-modal-title" variant="h5" component="h2">
              {props?.data?.title}
            </Typography>
          }

          {props?.data?.subTitle &&
            <Typography id="modal-modal-description" variant="h5" component="h5" sx={{ mt: 2 }}>
              {props?.data?.subTitle}
            </Typography>
          }

          {props?.data?.boldSubText &&
            <Typography id="modal-modal-description" fontWeight="bold" variant="h6" component="h6" sx={{ mt: 2 }}>
              {props?.data?.boldSubText}
            </Typography>
          }

          {props?.data?.function == "paymentUpdate" &&
            <Checkout data={props?.formData} modalData={props?.data} userData={props?.userData}/>
          }

          {props?.data?.SecondaryButtonText &&
            <Button sx={secondaryButtonTextStyle} size='large' autoFocus variant='contained' onClick={onclick(props?.data?.secondaryOnClick)}>{props?.data?.SecondaryButtonText}</Button>
          }

          {props?.data?.PrimaryButtonText &&
            <Button sx={{ mt: 2 }} size='large' autoFocus variant='contained' onClick={onclick(props?.data?.primaryOnClick)}>{props?.data?.PrimaryButtonText}</Button>
          }

        </Box>
      </Modal>
    </div>
  );
}
