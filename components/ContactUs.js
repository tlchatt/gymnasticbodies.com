import React, { useState } from 'react';
import Button from '@mui/material/Button';

import Typography from '@mui/material/Typography';

import { Fragment } from 'react';
import styles from './Form.module.scss'
import { submitForm } from '@/lib/SubmitForm.js';
import { Airplane, Icon, ThumbsUp } from '@/lib/icon';

/*const useStyles = makeStyles(theme => ({
    //   title: {
    //     color: "#656464",
    //     padding: "24px 0 0",
    //   },
    root: {
        padding: 24
    },
    gridItem: {
        display: 'flex',
        justifyContent: 'center',
    },
    cancel: {
        backgroundColor: "#91EEFF !important",
        color: '#656464',
        padding: '4px 30px',
        fontSize: '18px',
        marginBottom: 24,
        border: '#707070 solid 1px',
        [theme.breakpoints.up(425)]: {
            margin: '12px 0',
        },
        borderRadius: 8,
    },


}));*/



export const ContactUs = (props) => {
    let titleStyle = {
        color: "#656464",
        padding: "24px 0 0",
    }
    let cancelStyle = {
        backgroundColor: "#91EEFF !important",
        color: '#FFFFFF',
        padding: '4px 30px',
        fontSize: '18px',
        marginBottom: 24,
        border: '#707070 solid 1px',
        borderRadius: 8,
    }
    let defaultSection = { // appearance.ContactForm is the default form settings if that's not set these are.
        "steps": [
            "contact_info_form"
        ],
        "contact_info_form": {
            "inputs": [
                {
                    "type": "text",
                    "content": "Name",
                    "id": "name",
                    "icon": "Person"
                },
                {
                    "type": "tel",
                    "content": "Phone Number",
                    "id": "phone",
                    "icon": "Phone"
                },
                {
                    "type": "email",
                    "content": "Email",
                    "id": "email",
                    "icon": "Email"
                },
                {
                    "type": "textarea",
                    "content": "How Can We Help You?",
                    "id": "message",
                    "icon": "Message"
                }
            ]
        },
        "scheme": "secondary",
        "note": "By submitting this form, you agree to be contacted via the information given through email, phone call, or text message."
    }
    let branding = {
        Settings: {
            Email: "support@gymnasticbodies.com", //to email. 
            SiteTitle: "my.gymnasticbodies.com"
        }
    }
    // const classes = useStyles();
    let appearance = {}
    let scheme = "primary"
    let section = null
    if (!section) {
        section = defaultSection
    }
    // console.log("section later:",section)
    section.steps = section?.steps ? section?.steps : defaultSection.steps
    section.scheme = section?.scheme ? section?.scheme : defaultSection.scheme
    section.note = section?.note ? section?.note : defaultSection.note
    /**Section Data Registartion */

    /**Variables, States, Handlers Registartion */
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [failed, setFailed] = useState(false);
    const [note, setNote] = useState(section?.note);
    const [selectedOption, setselectedOption] = useState();

    let formInfo = {} //State Causes Rerender.
    let [userFieldValues, setUserFieldValues] = useState()

    const handleSending = async (e) => {
        console.log("sending is:", sending)
        if (!sending) {

            if (!(await validateForm(formInfo))) {
                return
            }

            setSending(true);
            var res = await submitForm(branding, formInfo)
            console.log("res in fitnessQuiz is:", res)
            setTimeout(() => {
                if (res) {
                    console.log('res', res)
                    setSending(false);
                    setSent(true)
                    setNote('Message Sent Succesfully!')
                }
                else {
                    setSending(false);
                    setSent(true)
                    setFailed(true)
                    setNote(`Send failed! please try again, or try an alternate form of contact. Sending a heads up email to ${branding.Settings.Email} or call or ${branding.Settings.Phone}, if the problem continues, would be greatly appreciated.`)
                }
            }, 5000);
        }
    };

    const handleFormInfo = (e) => {
        if (userFieldValues) {
            formInfo = { ...userFieldValues, [e.target.id]: e.target.value }
            userFieldValues = { ...userFieldValues, [e.target.id]: e.target.value }
        }
        else {
            formInfo = { ...formInfo, [e.target.id]: e.target.value }
        }

        // formInfo = e.target ? { ...formInfo, [e.target.id]: e.target.value } : { ...e }

        // console.log("formInfo:",formInfo)
    };

    const handlSetOption = (chosen) => {
        // console.log('handlSetOption = (e) => {')
        setselectedOption(chosen)
    };

    /**Variables, States, Handlers Registartion */

    /**Section Color, Class, Styles, SVGs, Registartion */
    const StatusSVGClass = (sending) ? `${styles.StatusSVGSending} ${styles.StatusSVG}` : (sent) ? `${styles.StatusSVGSent} ${styles.StatusSVG}` : `${styles.StatusSVG} ${styles.hidden}`
    const StatusButtonClass = (sending) ? `${styles.buttonStyle} ${styles.fadeOut}` : (sent) ? `${styles.buttonStyle} ${styles.hidden}` : styles.buttonStyle
    var StatusIcon = (sending) ? Airplane : (failed) ? ThumbsDown : (sent) ? ThumbsUp : ThumbsUp

    // let { fgcolor, bgcolor } = Colors(appearance, scheme)
    let fgcolor = '#000000'
    let bgcolor = '#FAFAFA'

    const Style = {
        backgroundColor: bgcolor,
        color: fgcolor,
        height:"100%"
    }
    const SVGStyle = {
        color: fgcolor,
        background: bgcolor,
    }
    const LabelStyle = {
        color: fgcolor,
        borderBottom: "1px solid #000000"
    }
    const PStyle = {
        color: fgcolor,
    }
    const InputStyle = {
        color: fgcolor,
        // borderBottom: `1px solid black`,

    }
    return (
        <div style={Style} id='Form'>
            {/* {section.title && */}
            <Typography variant='h4' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>Contact Form</Typography>
            {/* } */}
            <FormInner />
        </div>
    )
    function FormInner() {
        const [stepCount, setStepCount] = useState(0);
        const [step, setStep] = useState(section.steps[stepCount]);
        const handleSetStep = () => {
            setStepCount(stepCount + 1)
            setStep(section.steps[stepCount + 1])
        }
        let inputs = section?.[step]?.inputs ? section?.[step]?.inputs : defaultSection?.[step]?.inputs

        if (!inputs) { return (<h1>No Inputs Provided to ContactForm - ContactFormInner</h1>) }

        return (
            <div className={styles.ContactForm} id="Form" >
                {/* {contactModal &&
          <div className={styles.CloseDiv} onClick={handleContactModal}>
            <Close ClassName={`${styles.SVG} ${styles.SVGClose}`} Style={Style} />
          </div>
        } */}

                <form id="Contact-Form" className={styles.Form} >
                    {inputs && !(sending) && !(sent) &&
                        inputs.map((item, index) => (
                            <FormItem item={item} key={index} />
                        ))
                    }
                    {stepCount == (section.steps.length - 1) && !(section.steps.includes("select_Options")) && !(sending) && !(sent) &&

                        <Button size='large' autoFocus onClick={handleSending} variant='contained' style={cancelStyle}>
                            Send
                        </Button>
                    }
                    <StatusIcon ClassName={StatusSVGClass} Style={SVGStyle} />
                    {!(section.steps.includes("select_Options")) && note &&
                        <Typography variant='subtitle2' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{note}</Typography>
                    }
                </form>
            </div>
        )

        function FormItem({ item }) {
            let { id, content, type, icon } = item
            /* NOTES
             * Values set to local input and also synched out to higher level variable.
            */
            const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000));
            const handleDateChange = (date) => {
                //   console.log(' const handleDateChange = (date) => {', date)
                setSelectedDate(date)
                let newe = {
                    target: {
                        id: 'DateTime',
                        value: date
                    }
                }
                handleSetStep()
                handleFormInfo(newe)
            }
            const handleDateSelect = () => { }//In case we want to use it one day
            const StatusClass = sending ? styles.fadeOut : sent ? styles.hidden : ''

            return (
                <div className={StatusClass} id='FormItem'>
                    {type === "date-pick" &&
                        <SchedulingDatePick appearance={appearance} />
                    }
                    {type === "time-pick" &&
                        <SchedulingTimePick appearance={appearance} />
                    }
                    {type === "select-Options" && !selectedOption &&
                        <Options appearance={appearance} />
                    }
                    {selectedOption &&
                        <Embed appearance={appearance} />
                    }
                    {!(type === "date-pick") && !(type === "time-pick") && !(type === "select-Options") &&
                        <FormFields />
                    }
                </div>
            )
            function SchedulingDatePick() {
                //console.log('section ', section)
                /**Notes / Todo:
                 */
                const isWeekday = (date) => {
                    const day = date.getDay();
                    return day !== 0 && day !== 6 && date > new Date();
                };
                let item = section?.[step]
                var H3Style = {
                    marginTop: '1rem'
                }
                return (
                    <div className="grid place-content-center" id='SchedulingDatePick'>
                        {(item.title) &&
                            <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{item.title}</Typography>
                        }
                        {/* <DatePicker
              selected={selectedDate}
              onSelect={handleDateSelect}
              onChange={handleDateChange}
              filterDate={isWeekday}
              inline /> */}
                    </div>
                )
            }
            function SchedulingTimePick() {
                /**
                 * Notes
                 * 
                 */
                const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
                let item = section?.[step]
                //console.log('SchedulingTimePick item', item.inputs)
                var H3Style = {
                    marginTop: '1rem'
                }
                return (

                    <div className="grid place-content-center" id='SchedulingTimePick'>
                        {(item.title) &&
                            <Typography variant='h3' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{item.title}</Typography>
                        }
                        <div className={'grid grid-cols-2 place-items-center'}>
                            {item.inputs[0].times &&
                                item.inputs[0].times.map((time) => (
                                    <TimeBlock time={time} key={`${time.hour} ${time.minute}`} />
                                ))
                            }
                        </div>
                        <Typography variant='h5' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{localTimeZone}</Typography>
                    </div>
                )
                function TimeBlock({ time }) {
                    let item = section?.[step]
                    let timeZone = item.inputs[0].time_zone
                    const [selectedTime, setSelectedTime] = useState(selectedDate);
                    function handleSelectedTime() {
                        setSelectedTime(timeSlot)
                        handleDateChange(timeSlot)
                        //console.log('timeSlot.toLocaleTimeString() ', timeSlot.toLocaleTimeString())
                    }

                    const getTimeinUserTZ = (targetDate, targetTimeZone, targetHourMinute) => {
                        /**
                         * This function will return a dateTime, expressed in the users current timezone,
                         * accurately including time changes variance. 
                         * Parameters, the originally intented time, date, timezone (non local to user)
                         ** targetDate, a date object, the originally intented date (non local to user)
                         *** Example: new Date(2023, 10, 10, 10, 30)
                         ** targetHourMinute:hour and minute expressed in array format, originally intented time (non local to user)
                         *** Example var targetHourMinute = [12,30]
                         ** targetTimeZone, a date object, the originally intented timeZone (non local to user)
                         *** Example: var originalTimeZone = 'US/Central' 
                         *** Requires a 'tz database time zone' name aka an IANA timezone name
                         *** Usefull list here https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
                         *** Date.prototype.toLocaleString() usng IANA time zone names is widely supported
                         *** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString#browser_compatibility
                         * https://stackoverflow.com/questions/63040256/sethours-in-different-timezones/76390582#76390582 (answered)
                         * ** get locaTimezone.   const localString = Intl.DateTimeFormat().resolvedOptions().timeZone
                         */
                        targetDate.setHours(targetHourMinute[0], targetHourMinute[1])
                        // ^-- Gets datetime of target hours and minutes, on the given date, set in wrong timeZone(user)
                        const dateTZShifted = targetDate.toLocaleString("en-US", { timeZone: targetTimeZone, dateStyle: 'long', timeStyle: 'long', hour12: false })
                        // ^-- Gets the wrongly set datetime string in the targetTimeZone (to calculate offest)
                        const dateLocalTZ = targetDate.toLocaleString("en-US", { dateStyle: 'long', timeStyle: 'long', hour12: false })
                        // ^-- Gets the wrongly set datetime string in the user time zone (to calculate offest)

                        let timeTZShifted = dateTZShifted.split(" ").slice(4, 5).join(' ').toString().split(':')
                        var originalTime = dateLocalTZ.split(" ").slice(4, 5).join(' ').toString().split(':')
                        // ^-- String Manipulation of LocaleString to get array of [Hour,Minute,Seconds]
                        let newLocalTime = [
                            Number(originalTime[0]) - Number(timeTZShifted[0]) + Number(originalTime[0]),
                            Number(originalTime[1]) - Number(timeTZShifted[1]) + Number(originalTime[1]),
                            0
                        ]
                        // ^-- Uses the difference between the two (offset) to get a correct [Hours, Minute] in user timezone
                        let outputDate = new Date(targetDate)
                        outputDate.setHours(Number(newLocalTime[0]), Number(newLocalTime[1]), Number(newLocalTime[2]))

                        //console.log('outputDateTime in User timezone', outputDate.toLocaleString("en-US", { dateStyle: 'long', timeStyle: 'long' }))
                        return (outputDate)
                    }

                    let timeSlot = getTimeinUserTZ(selectedDate, timeZone, [time.hour, time.minute])
                    let localTimeString = timeSlot.toLocaleTimeString()

                    // const isSmall = useMediaQuery('(min-width: 640px)');
                    const isSmall = true

                    var ButtonStyle = {
                        padding: '7px 0 7px 0',
                        width: '90%',
                        fontSize: (!isSmall) ? '1.15rem' : '1.15rem',//4xl vs 5xl'1.25rem',
                        margin: '.5rem auto',
                        cursor: 'pointer'
                    }
                    return (
                        <>
                            <Button style={ButtonStyle} content={localTimeString} scheme={section?.scheme} appearance={appearance} item='unset' onClick={handleSelectedTime}
                            />
                        </>
                    )

                }
            }
            function Options() {
                return (

                    <div id="optionsDiv" className={styles.optionStyles}>
                        {item.options.map((option, index) => (
                            <Fragment key={index}>
                                {option.href &&
                                    <Button classNames={StatusButtonClass} content={option.buttonContent} scheme={scheme} appearance={appearance}
                                        href={option.href} key={index} />
                                }
                                {option.embed &&
                                    <Button classNames={StatusButtonClass} content={option.buttonContent} scheme={scheme} appearance={appearance}
                                        onClick={() => handlSetOption(option.embed)} key={index} />
                                }
                            </Fragment>
                        ))}

                    </div>


                )

            }
            function Embed() {
                return (
                    <>
                        {selectedOption &&

                            <iframe id="sked-portal" sandbox="allow-top-navigation allow-scripts allow-forms allow-same-origin allow-popups" className={styles.iframeStyle}
                                src={selectedOption}>
                            </iframe>

                        }
                    </>
                )
            }
            function FormFields() {
                let initValue
                if (type === 'checkbox') {
                    initValue = true
                    let newe = {
                        target: {
                            id: id,
                            value: initValue
                        }
                    }
                    handleFormInfo(newe)//register in case left checked
                }
                else { initValue = '' }
                let [value, setValue] = useState(initValue);
                const [active, setActive] = useState(false);
                function handleValue(e) {
                    if (type === 'checkbox') {
                        setValue(!value)
                        let newe = {
                            target: {
                                id: e.target.id,
                                value: !value
                            }
                        }
                        handleFormInfo(newe)
                    }
                    else {
                        let newe = {
                            target: {
                                id: e.target.id,
                                value: e.target.value
                            }
                        }
                        setValue(e.target.value)
                        if (userFieldValues) {
                            handleFormInfo(newe)

                        } else {
                            handleFormInfo(e)
                        }

                    }
                }
                function handleActive(e) {
                    if (type === 'checkbox') {
                        return
                    }
                    if (e.target.value.length == 0) {
                        setActive(!active)
                    }

                }
                function showArea(e) {
                    console.log("open this")
                }


                const CheckBoxStyle = {
                    borderColor: fgcolor,
                }
                //get the content with the id from the top array
                let userFieldContent = userFieldValues ? defaultSection?.contact_info_form?.inputs?.filter(item => item.id === id && userFieldValues[id])[0]?.content : "";

                value = value == "" && userFieldValues ? userFieldValues[id] : value
                content = content == userFieldContent ? "" : content

                return (
                    <div className={`${styles.Item} ${StatusClass}`} id="Item">
                        <Icon ClassName={styles.SVG} Style={SVGStyle} Name={icon} />
                        
                        <label className={styles.Label} style={LabelStyle}>
                            {content &&
                                <Typography variant='body2' gutterBottom style={titleStyle} id="responsive-dialog-title" align='center'>{content}</Typography>
                            }
                            {type === "textarea" &&
                                <textarea type={type} id={id} name={id} className={styles.TextArea} style={InputStyle}
                                    required
                                    onFocus={e => handleActive(e)}
                                    onBlur={e => handleActive(e)}
                                    onChange={e => handleValue(e)}
                                    value={value}
                                />
                            }
                            {type === "tel" &&
                                <input type={type} id={id} name={id} className={styles.Input} style={InputStyle}
                                    onFocus={e => handleActive(e)}
                                    onBlur={e => handleActive(e)}
                                    onChange={e => handleValue(e)}
                                    value={value}
                                    required />
                            }
                            {type === "email" &&
                                <input type={type} id={id} name={id} className={styles.Input} style={InputStyle}
                                    onFocus={e => handleActive(e)}
                                    onBlur={e => handleActive(e)}
                                    onChange={e => handleValue(e)}
                                    value={value}
                                    required />
                            }
                            {type === "checkbox" &&
                                <input type={type} id={id} name={id} className={styles.CheckBox} style={CheckBoxStyle}
                                    onFocus={e => handleActive(e)}
                                    onBlur={e => handleActive(e)}
                                    onChange={e => handleValue(e)}
                                    value={value}
                                    checked={value}
                                />
                            }
                            {!(type === "textarea") && !(type === "checkbox") && !(type === "tel") && !(type === "email") &&
                                <input type={type} id={id} name={id} className={styles.Input} style={InputStyle}
                                    onFocus={e => handleActive(e)}
                                    onBlur={e => handleActive(e)}
                                    onChange={e => handleValue(e)}
                                    value={value}
                                />
                            }
                        </label>
                    </div>
                )
            }
        }
    }
    async function validateForm(formInfo) {//Need this -> validateFormFields

        let checkphone = await checkPhoneNumber(formInfo)

        let checkemail = await checkEmail(formInfo)


        if (checkphone && checkemail) {
            return true
        } else {
            return false
        }
    }
    async function checkPhoneNumber(formInfo) {
        let checkNumber, formattedNumber
        if (!formInfo.phone) {//empty field
            setNote('Please enter your phone number.')
            setFormValues('phone')
            return (false)
        } else {
            setFormValues()
            return (true)
            // formattedNumber = new AsYouType()?.input(formInfo.phone) //Parses and formats an incomplete phone number.  
            // checkNumber = isValidPhoneNumber(formattedNumber, 'US') //validates both phone number length and phone number digits.
            // if (!checkNumber) {//wrong number entered
            //   setFormValues('phone')
            //   setNote('Please enter a valid phone number.')
            //   return (false)
            // } else {
            //   console.log("right phone number", formInfo)
            //   setFormValues()
            //   return (true)
            // }




        }
    }
    async function checkEmail(formInfo) {
        if (!formInfo.email) {//empty field

            setFormValues('email')

            setNote('Please enter your email.')
            return (false)
        } else {
            // let checkEmail = val idator.validate(formInfo.email)
            if (!checkEmail) {//wrong email
                setFormValues('email')
                setNote('Please enter a valid email.')
                return (false)
            } else {
                setFormValues()
                return (true)
            }
        }
    }
    async function setFormValues(key) {
        formInfo = key ? { ...formInfo, [key]: '' } : { ...formInfo }
        setUserFieldValues(formInfo)

    }
}


