import { useState, useEffect } from "react";

export const RandomImages = () => {
    const images = [
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1030208.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1030713.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1070532.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1080127.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1080180.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1080199.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1080259.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/_1080391.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/bridge.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/chinhang.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/double+straddle.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/doublelever.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/half+lever.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/older-dislocates.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/P1000725.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/pikestretch.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/pseudoPlanchePushUp.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/StraddlePlanche_TuckPlanche_EricDaye.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/Stu+Jotham+-+IMG_6680+edited.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/DSC_9761.jpg',
        'https://gymfit-images.s3.amazonaws.com/2020-login/allan-cross-crop.jpg'
    ]
    const [randomImage, setRandomImage] = useState(null);
    useEffect(() => {
        const generateRandomImage = () => {
            const min = 0;
            const max = 20;
            const randomIndex = Math.floor(Math.random() * (max - min + 1) + min);
            return images[randomIndex];
        };
        setRandomImage(generateRandomImage());
    }, []); // empty dependency array to run only once

    let randomImagesStyle = {
        width: "100%",
        height: "100%",
        objectFit:"cover"
    }
    return (
        <div style={{ width: 'inherit', height: '100%', position: 'fixed' }}>
            <img src={randomImage} alt="randomImages" style={randomImagesStyle} />
        </div>
    )
}