'use client';
import React, { useState, useRef, useEffect } from 'react';
import './Forms.css'
import { StandardContainer } from './StandardContainer/StandardContainer';
import { Airplane, ThumbsUp, ThumbsDown, Close, Icon, CircleProgress, ExclamationCircle, CheckCircle } from '../lib/icon.js';
import TextField from '@mui/material/TextField';
import DatePicker from "react-datepicker";
import { Fragment } from 'react';
import { GetSettings } from "@/lib/GetSettings.js";
import { StandardElement } from "@/components/elements/StandardElement/StandardElement";
import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import validator from "email-validator";
import { FeaturedHeadline, FeaturedText, FeaturedSubHeadline, FeaturedButton } from './elements/FeaturedItem/FeaturedItem';
import Script from "next/script";
import PhoneInput from 'react-phone-number-input/input'
import { TextBlock } from './TextBlock/TextBlock';
import Countries from '../data/countries.json'
import { submitForm } from '@/lib/SubmitForm';
import { PaymentPortal } from './PaymentPortal';
export function Forms(props) {

    console.log("props in frms:",props)
    /** NOTES:
     * Add Mask for clean formating. 
     * Add email validation
     * Handle required and incomplete.
     * Detect spam
     * fonts for message and longer emails
     * console.log('Form() section: ', section)
    */
    let { Settings, Style, Media } = GetSettings(props, "Forms");
    let { isActive, isLargeMobile, isSmall, isLarge, isXLarge, isHD } = Media;
    let formsData = props?.data
    // console.log("formsData:", formsData)
    /**Variables, States, Handlers Registartion */
    let [sending, setSending] = useState(false);
    let [sent, setSent] = useState(false);
    let [failed, setFailed] = useState(false);
    let [note, setNote] = useState(formsData.note);
    let [selectedFormIndex, setSelectedFormIndex] = useState(0);
    let [selectedOption, setselectedOption] = useState();
    let defaultInput = formsData["form-Options"].inputs[0].options[0].inputs ? formsData["form-Options"].inputs[0].options[0].inputs : []
    // console.log("defaultInput:", defaultInput)
    let formTitle = formsData["form-Options"].inputs[0].options[0].formTitle ? formsData["form-Options"].inputs[0].options[0].formTitle : 'Please select the reason for your inquiry'
    let [selectedFormFields, setSelectedFormFields] = useState(defaultInput)
    let [formNote, setFormNote] = useState(formsData["form-Options"].inputs[0].options[0]);//note on the form, different for individual form.
    let [selectedFormTitle, setSelectedFormTitle] = useState("Select an Option")
    let [countryCode, setCountryCode] = useState()
    let [countrySelectedName, setCountrySelectedName] = useState()

    function handleSetFormSelected(e) {
        const selectedIndex = e?.target?.selectedIndex ? e?.target?.selectedIndex : '1';
        setSelectedFormIndex(selectedIndex)
        const selectedText = e?.target?.options[selectedIndex]?.text //formName
        let formNoteContent = formsData["form-Options"].inputs[0].options[selectedIndex - 1]
        setFormNote({ ...formNoteContent })
        let content = e?.target?.value
        // console.log("content:", content)
        if (content.includes("{")) {
            setSelectedFormFields(JSON.parse(content))
        } else {
            setSelectedFormFields([])
        }
        setSelectedFormTitle(selectedText)
    }
    const handleSending = async (e) => {
        // setSending(true)

        if (!sending) {

            if (!(await validateForm(formInfo))) {
                // setSending(false);
                // setSent(true)
                // setFailed(true)
                // setNote('Send failed! please try again, or try an alternate form of contact. Sending a heads up email to info@tlchatt.com or give us a call, if the problem continues, would be greatly appreciated.')
                return
            }
            // setSending(false);
            //setSent(true)
            //setNote('Message Sent Succesfully!')
            setSending(true);
            var res = await submitForm(formInfo)
            setTimeout(() => {
                if (res) {
                    console.log('res', res)
                    setSending(false);
                    setSent(true)
                }
                else {
                    setSending(false);

                    setFailed(true)
                    setNote(`Send failed! please try again, or try an alternate form of contact. Sending a heads up email to ${branding.Settings.Email}, if the problem continues, would be greatly appreciated.`)
                }
            }, 5000);
        }
    };
    const handleFormInfo = (e) => {
        formInfo = { ...formInfo, [e.target.id]: e.target.value }
    };
    const handlSetOption = (chosen) => {
        setselectedOption(chosen)
    };

    /**Section Data Registrtion */
    formsData.steps = formsData?.steps ? formsData?.steps : "no steps mentioned"
    formsData.note = formsData?.note ? formsData?.note : ""
    let formInfo = {}

    /** Styles */
    const StatusSVGClass = (sending) ? `StatusSVGSending StatusSVG` : (sent) ? `StatusSVGSent StatusSVG` : `StatusSVG hidden`
    // const StatusButtonClass = (sending) ? `${buttonStyle} ${fadeOut}` : (sent) ? `${buttonStyle} ${hidden}` : buttonStyle
    const StatusButtonClass = (sending) ? `fadeOut` : (sent) ? `hidden` : ''
    // <Icon ClassName="SVG" Style={wrongInputSVGStyle} Name={ExclamationCircle} />

    var StatusIcon = (sending) ? Airplane : (failed) ? ThumbsDown : (sent) ? ThumbsUp : ThumbsUp
    let ContainerStyle = {
        ...Style,
    }
    let ContainerInnerStyle = {
        ...Style,
        placeContent: 'unset',
        gap: Settings.lowestGap,
        width: "100%"
    }
    let HeadlineStyle = {
        color: Style.color,
        backgroundColor: "unset"
    }

    return (
        <>
            <Script src="https://js.authorize.net/v3/AcceptUI.js" strategy="beforeInteractive" />
            <Script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&loading=async&libraries=places&callback=handleAddressList`} />
            <StandardContainer style={ContainerStyle} innerStyle={ContainerInnerStyle} innerClassName="StandardContainerInnerMargin" id={Settings.id} innerID={Settings.innerID} {...props}>

                {(formsData.title && !sent) &&
                    <FeaturedHeadline scheme={Settings.scheme} style={HeadlineStyle} data={{ text: formsData.title, tag: "h1", hr: false }} />
                }
                <FormInner />

            </StandardContainer>
        </>
    )
    function FormInner() {
        let { Settings, Style, Media } = GetSettings(props, "FormInner");
        let [countryValue, setCountryValue] = useState("")
        const [stepCount, setStepCount] = useState(0);
        const [step, setStep] = useState(formsData.steps[stepCount]);
        const handleSetStep = () => {
            setStepCount(stepCount + 1)
            setStep(formsData.steps[stepCount + 1])
        }
        let inputs = selectedFormFields.length > 0 || formsData?.[step]?.inputs ? [...formsData?.[step]?.inputs, ...selectedFormFields] : ""
        let isInput = inputs.length == "1" ? false : true

        if (!inputs) { return (<h1>No Inputs Provided to ContactForm - ContactFormInner</h1>) }
        let linkStyle = {
            justifySelf: "unset",
            margin: Settings.lowMargin,
            gridColumn: isSmall ? "span 2" : "span 1",
            justifyItems: 'center',
            width: 'inherit',
        }
        const [isRendered, setIsRendered] = useState(false); //for submit button to only show if form INPUT fields are rendered

        const SVGStyle = {
            color: Style.fgaccent,
            background: Style.backgroundColor,
            margin: sent ? "auto" : "",
            width: sent ? "fit-content" : "",
            position: sent ? "initial" : "",
            display: sent ? "grid" : "",
            gridColumn: isSmall ? "span 2" : "span 1"
        }
        let noteStyle = {
            color: Style.color,
            backgroundColor: "unset",
            display: "grid",
            margin: Settings.lowMargin,
            justifyContent: "center",
            // gridColumn: "span 2"
            gridColumn: isSmall ? "span 2" : "span 1"
        }
        let FormInnerStyle = {
            display: 'grid',
            gap: isSmall ? Settings.standardGap : Settings.highPadding,//GW: could we add hghgap?
            position: 'relative',
            alignSelf: 'start',
            placeItems: 'unset',
            minWidth: '100%',
            overflow: 'inherit',
            gridTemplateColumns: '1fr 1fr'
        }
        let textBlockStyle = {
            padding: Settings.lowPadding,
            // border: `1px solid ${Style.fgaccent}`,
            //borderBottom: `6px solid ${Style.fgaccent}`,
            borderRadius: "4px",
            marginTop: Settings.lowMargin,
        }
        let buttonText = formsData[formsData.steps]?.inputs[0]?.options[selectedFormIndex - 1]?.buttonText
        buttonText = buttonText ? buttonText : "Send Message"
        let formAction = props?.data?.formAction ? props?.data?.formAction : ""
        
        return (

            <form id={Settings.id} style={FormInnerStyle} action={formAction}>

                {inputs && !(sending) && !(sent) &&
                    <>
                        {inputs.map((item, index) => (
                            <FormItem item={item} key={index} />
                        ))}
                    </>
                }

                {/* {stepCount == (formsData.steps.length - 1) && !(formsData.steps.includes("select_Options")) && !(sending) && isRendered &&
                    <>
                        <FeaturedButton scheme={Settings.scheme} style={linkStyle} data={{ text: buttonText, ariaLabel: "Submit Form", svg: true, transparent: true }} onClick={handleSending} />
                    </>

                } */}

                <StatusIcon ClassName={StatusSVGClass} Style={SVGStyle} />
                {!(formsData.steps.includes("select_Options")) && isInput && note &&
                    <FeaturedSubHeadline scheme={Settings.scheme} style={noteStyle} data={{ text: note, tag: "p", hr: false }} />
                }
            </form>
        )

        function FormItem({ item }) {
            // console.log("item is:", item)
            let { id, content, type, icon } = item
            const StatusClass = sending ? 'fadeOut' : sent ? hidden : ''

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

            let formItemStyle = {
                display: "grid",
                gridColumn: isSmall ? (item.width != "half") ? "span 2" : "span 1" : "span 2",
                // gridColumn: (item.width != "half") ? "span 2" : "span 1"

            }
            return (
                <div className={StatusClass} id='FormItem' style={formItemStyle}>
                    {type === "form-Options" && !selectedOption && //Drop Down Selector, that changes to Subset of inputs
                        <SelectFormOption />
                    }
                    {type === "date-pick" &&
                        <SchedulingDatePick />
                    }
                    {type === "time-pick" &&
                        <SchedulingTimePick />
                    }
                    {type === "select-Options" && !selectedOption && //Button Based Options that navigate. 
                        <Options />
                    }
                    {selectedOption &&
                        <Embed />
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
                            <H3 scheme={section?.scheme} content={item.title} appearance={appearance} style={H3Style} />
                        }
                        <DatePicker
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            onChange={handleDateChange}
                            filterDate={isWeekday}
                            inline />
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
                            <H3 scheme={section?.scheme} content={item.title} appearance={appearance} style={H3Style} />
                        }
                        <div className={'grid grid-cols-2 place-items-center'}>
                            {item.inputs[0].times &&
                                item.inputs[0].times.map((time) => (
                                    <TimeBlock time={time} key={`${time.hour} ${time.minute}`} />
                                ))
                            }
                        </div>
                        <H5 classNames={`mt-4 sm:mt-8 justify-self-center self-center`} scheme={section?.scheme} content={localTimeZone} appearance={appearance} />
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

                    const isSmall = useMediaQuery('(min-width: 640px)');

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
                let { Settings, Style, Media } = GetSettings(props, "Options");
                let optionStyles = {
                    display: "grid",
                    gridAutoFlow: isSmall ? "column" : "row",
                    padding: isSmall ? "0 50px" : "0px"
                }
                return (
                    <div id="optionsDiv" style={optionStyles}>
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
            function SelectFormOption() {
                let { Settings, Style, Media, TextStyle } = GetSettings(props, "SelectFormOption");
                let selectFormStyles = {
                    ...TextStyle,
                    color: (selectedFormTitle) ? `${Style.color}` : `oklch(44.4% 0.011 73.639)`,
                    padding: Settings.lowPadding,
                    background: Style.backgroundColor,
                    width: "100%",
                    border: `1px solid ${Style.fgaccent}`,
                    borderRadius: '3px',
                    textWrap: "auto",
                    height: isSmall ? "auto" : "20vw",
                    display: "grid",
                }

                return (
                    <>
                        {item.options.length > 1 &&
                            <Select
                                labelId="formOptions"
                                id="formOptions"
                                value={age}
                                style={selectFormStyles}
                                label="Age"
                                form="forms"
                                onChange={(e) => handleSetFormSelected(e)}
                            >
                                <MenuItem style={{ display: "none" }} id="defaultFormField" value={JSON.stringify(item.options[0].inputs)}>{selectedFormTitle ? selectedFormTitle : 'Select an Option'}</MenuItem>
                                {item.options.map((option, index) => (
                                    <MenuItem id={option.id} key={index} value={JSON.stringify(option.inputs)}>{option.formTitle}</MenuItem>
                                ))}
                            </Select>
                            // <select id="formOptions" form="forms" style={selectFormStyles} onChange={(e) => handleSetFormSelected(e)} >
                            //     <option style={{ display: "none" }} id="defaultFormField" value={JSON.stringify(item.options[0].inputs)}>{selectedFormTitle ? selectedFormTitle : 'Select an Option'}</option>
                            //     {item.options.map((option, index) => (
                            //         <option id={option.id} key={index} value={JSON.stringify(option.inputs)}>{option.formTitle}</option>
                            //     ))}
                            // </select> 
                        }

                        {formNote?.textblock &&
                            <TextBlock {...props} data={formNote.textblock} innerStyle={textBlockStyle} innerClassName='shadow-md shadow-blue-500/40' />
                        }
                    </>

                )
            }
            function Embed() {
                return (
                    selectedOption &&
                    <iframe id="sked-portal" sandbox="allow-top-navigation allow-scripts allow-forms allow-same-origin allow-popups" className={iframeStyle}
                        src={selectedOption}>
                    </iframe>
                )
            }
            function FormFields() {
                let { Settings, Style, Media, TextStyle } = GetSettings(props, "FormFields");
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
                } else if (type === 'tel') {
                    initValue = formInfo[id] ? formInfo[id] : ''
                    /*if(initValue != '' && countryValue.length == 0){
                        let phonenumber = parsePhoneNumberFromString(initValue);
                        let countryNameFromPhone = Countries.filter(item => item.country === phonenumber.country)[0]?.name
                        setCountryValue(countryNameFromPhone)
                    }*/
                } else if (type == 'search_country') {
                    initValue = countryValue.length > 0 ? countryValue : ''
                } else if (type == 'email') {
                    initValue = formInfo[id] ? formInfo[id] : ''
                } else if (type == 'address') {
                    initValue = ''
                } else {
                    initValue = formInfo[id] ? formInfo[id] : ''
                }

                let [value, setValue] = useState(initValue);
                let [engaged, setEngaged] = useState(false);//for all inputs
                let [valid, setValid] = useState(true);//for validated inputs on non validated types this is true.
                let [countriesFound, setCountriesFound] = useState([])
                let passwordLength = 10
                let validPassword = false
                if(type == "password"){
                    validPassword = value.length > 0 && value.length > passwordLength
                }
                /*
                 *   if just engaged and nothing else - editing icon ...
                 *   if engaged and value in the input and not valid input - editing icon ...
                 *   if engaged and has value and has a valid value - right icon
                 *   if not engaged and has value and valid value - right icon
                 *   if not engaged and doesn't have a value - show no icon
                 *   if not engaged and has value and not valid value - negative icon
                */
                async function handleValue(e) {

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
                    else if (type === 'tel') {
                        // console.log("e is:", e.target.value)
                        if (e) {
                            setValue(e.target.value)

                            let phoneInfo = await checkPhoneNumber(e.target.value)
                            let newe = {
                                target: {
                                    id: id,
                                    value: phoneInfo.value
                                }
                            }
                            handleFormInfo(newe)

                            if (phoneInfo?.status) {

                                setValid(true)
                                if (countryValue.length == 0) {
                                    setCountryValue(phoneInfo.country)
                                }

                            } else {
                                setValid(false)
                            }
                        }


                    }
                    else if (type === 'email') {
                        setValue(e.target.value)
                        checkEmail(e.target.value)
                    }
                    else if (type === 'address') {
                        setValue(e?.target?.value)
                        handleAddressList(e?.target?.value)
                    }
                    else if (type === 'search_country') {
                        if (e?.target?.value?.length == 0) {
                            let countryNameFromPhone
                            setValue('')
                            setCountryValue('')
                            // if (phoneNumberValue) {
                            //     let phonenumber = parsePhoneNumberFromString(formInfo['phone']);
                            //     countryNameFromPhone = Countries.filter(item => item.country === phonenumber.country)[0]?.name

                            // }
                            // console.log("countryValue:",countryValue)
                            // console.log("countryNameFromPhone:",countryNameFromPhone)
                            // if(countryNameFromPhone == countryValue){
                            //     setValue('')
                            // }else{
                            //     setValue(countryNameFromPhone)
                            //     setCountriesFound([])
                            // }
                        }
                        if (e?.target?.value) {
                            let filteredCountryList
                            setValue(e.target.value)
                            let countrySearch = e.target.value ? e.target.value : ""

                            if (countrySearch.length >= 0) {
                                filteredCountryList = Countries.filter(country => country.name.toLowerCase().includes(countrySearch.toLowerCase()))
                                setCountriesFound(filteredCountryList)
                                setValid(false)
                            }
                        }
                        if (e?.target?.outerText) {

                            setValue(e?.target?.outerText)//value of the input set to that of the country selected
                            setCountryValue(e?.target?.outerText)
                            setCountriesFound([])

                            setValid(true)
                        }
                    }
                    else {
                        setValue(e.target.value)
                        
                        if(type == "password"){
                            e.target.value.length > 10 ? setValid(true) : setValid(false)
                        }else{
                            e.target.value.length > 0 ? setValid(true) : setValid(false)
                        }
                        handleFormInfo(e)
                    }
                }
                function handleEngage() {
                    setEngaged(!engaged)
                }
                let FormFieldsItem = {
                    ...Style,
                    position: "relative",
                    display: "grid",
                    alignItems: "center",
                    border: `1px solid ${Style.fgaccent}`,
                    borderRadius: '3px'
                }

                const LabelStyle = {

                    color: Style.fgaccent,
                    position: (value.length > 0 || engaged) ? "relative" : "absolute",//PC
                    display: 'grid',
                    alignItems: 'center',
                    alignItems: "center",
                    borderRadius: "4px",
                }

                let LabelContentStyle = {
                    ...TextStyle,
                    color: (value.length > 0 || engaged) ? `${Style.fgaccent}` : `oklch(44.4% 0.011 73.639)`,
                    //opacity: engaged ? '.5' : '.25',
                    // display: engaged ? 'none' : 'grid',
                    // display: value != "" || engaged ? 'none' : 'grid',
                    position: (value.length > 0 || engaged) ? 'absolute' : 'relative',
                    display: "grid",
                    // position: "relative",//PC
                    padding: Settings.lowPaddingY,
                    margin: Settings.lowMarginY,


                }

                const InputSVGStyle = {
                    color: Style.fgaccent,
                    background: Style.backgroundColor,
                    // position: "absolute",
                    zIndex: "1",
                    right: "0"
                }
                const checkInputSVGStyle = {
                    // color: Style.fgaccent,
                    // background: Style.backgroundColor,
                    color: '#FFFFFF',
                    background: '#65a30d',
                    zIndex: "1",
                    // position: "absolute",
                    right: "0"
                }
                const wrongInputSVGStyle = {
                    color: '#FFFFFF',
                    background: '#dc2626',
                    zIndex: "1",
                    // position: "absolute",
                    right: "0"
                }
                const InputStyle = {
                    color: '#000',
                    padding: Settings.lowPadding,
                    border: 'none',
                    outline: 'none',
                    position: 'relative'

                }
                const addressInputStyle = {
                    // color: Style.fgaccent,
                    color: '#000',
                    position: 'relative',
                    padding: isSmall ? Settings.lowPadding : `${Settings.standardPadding} ${Settings.lowPadding} ${Settings.lowPadding} ${Settings.lowPadding}`,
                    border: 'none',
                    outline: 'none',
                }
                const textareaInputStyle = {
                    // color: Style.fgaccent,
                    color: '#000',
                    height: "7rem",
                    lineHeight: "2.5rem",
                    border: 'none',
                    outline: 'none',
                    zIndex: "999",
                    padding: Settings.lowPadding
                }
                const CheckBoxStyle = {
                    borderColor: Style.fgaccent,
                }
                let requiredValue = item['required'] ? item['required'] : false
                const ref = (node) => {
                    if (node) {
                        setIsRendered(true);
                    }
                };
                let inputFieldsStyle = {
                    gridTemplateColumns: "1fr",
                    gridTemplateRows: (type === "search_country" && countriesFound.length > 0) ? "auto auto" : "none",
                    // position:"absolute",
                    display: "grid",
                    gridAutoFlow: "column",
                    alignItems: "center"
                }
                console.log("type is:", type)
                return (
                    <>
                        {content &&
                            <div className={`${StatusClass}`} id="FormItem" style={FormFieldsItem} ref={ref}>
                                {/* {icon &&
                                    <Icon ClassName="SVG" Style={SVGStyle} Name={icon} />
                                } */}
                                {/* <label style={LabelStyle} onClick={handleEngage}>
                                    {item.content &&
                                        <StandardElement {...props} onClick={handleEngage} style={LabelContentStyle} scheme={Settings.scheme} data={{ text: item.content, tag: "p", hr: false }}
                                        />
                                    }
                                </label> */}
                                <div id="inputFields" style={inputFieldsStyle}>
                                    {type === "textarea" &&
                                        <textarea
                                            type={type}
                                            id={id}
                                            name={id}
                                            className="TextArea"
                                            style={textareaInputStyle}
                                            onFocus={handleEngage}
                                            onBlur={handleEngage}
                                            onChange={e => handleValue(e)}
                                            value={value}
                                            required={requiredValue}
                                        />
                                    }
                                    {type === "tel" &&
                                        <TextField
                                            variant="outlined"
                                            margin="normal"
                                            required={requiredValue}
                                            fullWidth
                                            id="phone"
                                            label="Phone Number"
                                            value={value}
                                            onFocus={e => handleEngage()}
                                            onChange={e => handleValue(e)}
                                            onBlur={e => handleEngage()}
                                        />
                                    }
                                    {type === "email" &&
                                        <TextField
                                            variant="outlined"
                                            margin="normal"
                                            required={requiredValue}
                                            fullWidth
                                            value={value}
                                            id="email"
                                            label="Email Address"
                                            name="email"
                                            autoComplete="email"
                                            onFocus={e => handleEngage()}
                                            onChange={e => handleValue(e)}
                                            onBlur={e => handleEngage()}
                                        />
                                    }
                                    {type === "checkbox" &&
                                        <input
                                            type={type}
                                            id={id}
                                            name={id}
                                            className="CheckBox"
                                            style={CheckBoxStyle}
                                            onFocus={e => handleValue(e)}
                                            onBlur={e => handleValue(e)}
                                            onChange={e => handleValue(e)}
                                            value={value}
                                            checked={value}
                                            required={requiredValue}
                                        />
                                    }
                                    {type === "search_country" &&
                                        <>
                                            <TextField
                                                variant="outlined"
                                                margin="normal"
                                                required={requiredValue}
                                                fullWidth
                                                id={id}
                                                label="Country"
                                                name={id}
                                                value={value}
                                                onFocus={e => handleEngage()}
                                                onChange={e => handleValue(e)}
                                                onBlur={e => handleEngage()}
                                            />
                                            {(countriesFound.length > 0) &&
                                                <DisplayCountries />
                                            }
                                        </>
                                    }
                                    {type === "pay" &&

                                        <PaymentPortal />

                                    }
                                    {type == "address" &&
                                        <TextField
                                            variant="outlined"
                                            margin="normal"
                                            required={requiredValue}
                                            fullWidth
                                            id={id}
                                            label="Country"
                                            name={id}
                                            value={value}
                                            style={addressInputStyle}
                                            onFocus={e => handleEngage()}
                                            onChange={e => handleValue(e)}
                                            onBlur={e => handleEngage()}
                                        />
                                    }
                                    {type == "password" &&
                                        <TextField
                                            variant="outlined"
                                            margin="normal"
                                            required={requiredValue}
                                            fullWidth
                                            id={"password"}
                                            label={content}
                                            name={id}
                                            value={value}
                                            error={!validPassword}
                                            helperText={!validPassword ? `Must be at least ${passwordLength} characters` : ' '}
                                            onFocus={e => handleEngage()}
                                            onChange={e => handleValue(e)}
                                            onBlur={e => handleEngage()}
                                            slotProps={{
                                                //This targets the actual <input> element
                                                htmlInput: { 
                                                  minLength: 10
                                                }
                                              }}
                                        />
                                    }
                                    {type === "pay" &&
                                        <PaymentPortal />
                                    }
                                    {!(type === "textarea") && !(type === "checkbox") && !(type === "tel") && !(type === "email") && !(type === "address") && !(type === "search_country") && !(type === "pay") && !(type == "password") &&
                                        <input
                                        type={type}
                                        id={id}
                                        name={id}
                                        className="Input"
                                        style={InputStyle}
                                        onFocus={e => handleEngage()}
                                        onBlur={e => handleEngage()}
                                        onChange={e => handleValue(e)}
                                        value={value}
                                        required={requiredValue}

                                    />
                                    }
                                    {engaged && !value && !valid &&
                                        <SandGlassLoader Style={InputSVGStyle} />
                                    }
                                    {engaged && value && !valid &&
                                        <SandGlassLoader Style={InputSVGStyle} />
                                    }
                                    {engaged && value && valid &&
                                        <Icon ClassName="SVG" Style={checkInputSVGStyle} Name={CheckCircle} />
                                    }
                                    {!engaged && value && valid &&
                                        <Icon ClassName="SVG" Style={checkInputSVGStyle} Name={CheckCircle} />
                                    }
                                    {!engaged && value && !valid &&
                                        <Icon ClassName="SVG" Style={wrongInputSVGStyle} Name={ExclamationCircle} />
                                    }
                                </div>
                            </div>
                        }
                    </>
                )

                async function checkPhoneNumber(number) {
                    if (number) {

                    }
                    let phonenumber = parsePhoneNumberFromString(number);
                    let checkNumber
                    let countryName
                    phonenumber = phonenumber ? phonenumber : { country: "US" }
                    if (phonenumber?.country) {
                        countryName = Countries.filter(item => item.country === phonenumber.country)[0]?.name
                        checkNumber = isValidPhoneNumber(number, `${phonenumber.country}`) //validates both phone number length and phone number digits.

                    }
                    return ({
                        status: checkNumber,
                        country: countryName,
                        value: checkNumber ? number : "wrong value"
                    })
                    // let newe = {
                    //     target: {
                    //         id: id,
                    //         value: checkNumber ? number : "wrong value"
                    //     }
                    // }
                    // handleFormInfo(newe)
                }
                async function checkEmail(email) {
                    let checkEmail = validator.validate(email)
                    if (checkEmail) {
                        setValid(true)
                    } else {
                        setValid(false)
                    }
                    let newe = {
                        target: {
                            id: id,
                            value: checkEmail ? email : "wrong value"
                        }
                    }
                    handleFormInfo(newe)
                }
                function handleAddressList(targetValue) {
                    //gets the country code from country json based on the country selected in the search country input


                    let countryInput = document.querySelectorAll("#search_country")[0].value
                    let countryCode = Countries.filter(item => item.name === countryInput)[0]?.country
                    let countryName = countryCode ? countryCode : "USA"

                    const center = { lat: 50.064192, lng: -130.605469 };
                    // Create a bounding box with sides ~10km away from the center point
                    const defaultBounds = {
                        north: center.lat + 0.1,
                        south: center.lat - 0.1,
                        east: center.lng + 0.1,
                        west: center.lng - 0.1,
                    };
                    const options = {
                        bounds: defaultBounds,
                        componentRestrictions: { country: `${countryName}` },
                        fields: ["formatted_address", "address_components", "geometry", "icon", "name"],
                        strictBounds: false,
                    };

                    const input = document.getElementById("company_Mailing_Address");
                    let autocomplete = new google.maps.places.Autocomplete(input, options);
                    autocomplete.addListener('place_changed', handleAddressSelect)
                    if (input.value.length == 0) {
                        setValid(false);
                        let newe = {
                            target: {
                                id: 'company_Mailing_Address',
                                value: "wrong value"
                            }
                        }
                        handleFormInfo(newe)
                    }

                    return null
                    function handleAddressSelect() {
                        let place = autocomplete.getPlace()
                        if (place.geometry) {
                            setValue(place?.formatted_address)// here and not in handleValue since we don't receive the selected address until we reach this function.
                            input.value = place.formatted_address
                            setValid(true);
                        } else {
                            setValid(false);
                        }

                        let newe = {
                            target: {
                                id: 'company_Mailing_Address',
                                value: place?.geometry ? place.formatted_address : "wrong value"
                            }
                        }

                        handleFormInfo(newe)
                    };
                };
                function DisplayCountries() {
                    let { Settings, Style, Media } = GetSettings(props, "DisplayCountries");
                    let { isActive, isLargeMobile, isSmall, isLarge, isXLarge, isHD } = Media;
                    //input field inside select fields
                    let selectCountryStyles = {
                        ...Style,
                        padding: Settings.lowPadding,
                        background: Style.backgroundColor,
                        width: "100%",
                        textWrap: "auto",
                        // height: isSmall ? "auto" : "20vw",
                        height: "auto",
                        maxHeight: "20vw",
                        overflow: "auto",
                        borderRadius: "4px",
                        display: "grid",
                        gap: Settings.lowestGap,
                        gridColumn: isSmall ? "span 2" : "span 1"
                    }

                    return (
                        <div id="search_country" style={selectCountryStyles} >
                            {/* <option style={{ display: "none" }} value={"Select a Country"}>Select a Country
                                    </option> */}
                            {countriesFound.map((item, index) => (
                                // <option id={item.country} key={index} value={item.name}>{item.name}</option>
                                <FeaturedText scheme={"primary"} onClick={handleValue} style={HeadlineStyle} data={{ text: item.name, tag: "p", hr: false }} key={index} />
                                // <FeaturedText scheme={"primary"} onClick={handleValue} style={HeadlineStyle} data={{ text: item.name, tag: "p", hr: false, href: `#${item.country}` }} key={index} />
                            ))}
                        </div>
                    )

                }

            }
        }
    }
    async function validateForm(formInfo) {
        //let formIndex = formsData["form-Options"].inputs[0].options.findIndex(option => option.formTitle === selectedFormTitle);//gets the index of the selected form from the formData

        // let requiredFields = formsData["form-Options"] ? formsData["form-Options"].inputs[0].options[formIndex].inputs.filter(input => input.required).map(input => input.id) : formsData?.inputs?.filter(input => input.required).map(input => input.id);
        // console.log("requiredFields:", requiredFields)
        // let isValid = requiredFields.every(field => Object.keys(formInfo).includes(field) && formInfo[field].trim() !== 'wrong value');
        // console.log("isValid:", isValid)
        return true
    }


}
// function BouncingDotsLoader(props) {
//     let individualBounceDivStyle = {
//         backgroundColor: props.Style.color,
//         display: "grid",
//     }
//     let bounceDivStyle = {
//         display: "grid",
//         // position: "absolute",
//         gridAutoFlow: "column",
//         right: "0"
//     }

//     return (
//         <>
//             <div className="bouncing-loader" style={bounceDivStyle}>
//                 <div style={individualBounceDivStyle}></div>
//                 <div style={individualBounceDivStyle}></div>
//                 <div style={individualBounceDivStyle}></div>
//             </div>
//         </>
//     );
// };

function SandGlassLoader() {
    return (

        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" className="processSVG" fill="none" stroke="#000000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            {/* <!-- Top and bottom frame/plates --> */}
            <path d="M6.5 7h11" fill="#4D4544" />
            <path d="M6.5 17h11" fill="#4D4544" />

            {/* <!-- The glass structure (bulbs) --> */}
            <path d="M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z" fill="#ECF1F6" stroke="#000000" />
            <path d="M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1z" fill="#ECF1F6" stroke="#000000" />

            {/* <!-- Representation of the sand -->
  <!-- The sand color can be adjusted by changing the 'fill' attribute here --> */}
            <path d="M19 6L5 6" stroke="rgba(17, 74, 85, 0.9)" strokeWidth="1" />
            <path d="M19 18L5 18" stroke="rgba(17, 74, 85, 0.9)" strokeWidth="1" />
        </svg>
    );
};