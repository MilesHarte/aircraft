import { FSComponent, MappedSubject, Subject, Subscribable, VNode } from '@microsoft/msfs-sdk';
import //.scss file
import { AbstractMfdPageProps } from 'instruments/src/MFD/MFD';
import { Footer } from 'instruments/src/MFD/pages/common/Footer';
import { InputField } from 'instruments/src/MFD/pages/common/InputField';
import {
  AirportFormat,
  FlightLevelFormat,
  LongAlphanumericFormat,
} from 'instruments/src/MFD/pages/common/DataEntryFormats';
import { A380AltitudeUtils } from '@shared/OperatingAltitudes';

render(): VNode {

    {//page content}
    <div class = "mfd-atccom-vertical-climb-to">
      <div class = "mfd-atccom-vertical-climb-to-input-field">REQUEST CLB TO</div>
      <InputField<number>
                dataEntryFormat={new FlightLevelFormat(Subject.create(0), Subject.create(maxCertifiedAlt / 10000))}         
                mandatory={Subject.create(false)}
                value={}
                alignText="center"
      />
    <div class = "mfd-atccom-vertical-climb-to">
      <div class = "mfd-atccom-vertical-climb-to-at-input-field">AT</div>
      <InputField<string>
                dataEntryFormat={}
                //Waypoint format?
                mandatory={Subject.create(false)}
                value={}
                alignText="center"
      />

    <Button
                label="" 
                //trash can looking button
                onClick= console.oog() 
                //Clear entry
                buttonStyle=""
                //small square button next to the first line
              />
    }
}
